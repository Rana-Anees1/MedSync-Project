import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { todayISO } from '../utils/date';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';

/**
 * Client-side cache of the data the signed-in user may see, loaded from the Express API.
 * Every action calls a REST endpoint and then refreshes the affected resources.
 * Pages read `state` in the same shape as the original prototype, so the UI components are unchanged.
 */
const StoreContext = createContext(null);
const STAFF = ['surgeon', 'anaesthetist', 'coordinator'];
const EMPTY = { sim: { today: todayISO() }, cases: [], patients: [], users: [], templates: [], rules: null, notifications: [], audit: [] };

export function StoreProvider({ children }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState(EMPTY);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const role = user?.role;
  const roleRef = useRef(role);
  roleRef.current = role;

  const loaders = useMemo(() => ({
    cases: () => api.get('/procedures'),
    patients: () => (role === 'patient' ? api.get('/patients/me').then((p) => [p]) : STAFF.includes(role) ? api.get('/patients') : Promise.resolve([])),
    users: () => (role === 'admin' ? api.get('/users') : api.get('/users/directory')),
    templates: () => (role === 'patient' ? Promise.resolve([]) : api.get('/procedure-types')),
    rules: () => (role === 'patient' ? Promise.resolve(null) : api.get('/settings/rules')),
    notifications: () => api.get('/notifications'),
    audit: () => (role === 'admin' ? api.get('/audit') : Promise.resolve([])),
    sim: () => api.get('/health', { auth: false }).then((h) => ({ today: h.today })),
  }), [role]);

  const refresh = useCallback(async (...keys) => {
    const list = keys.length ? keys : Object.keys(loaders);
    const values = await Promise.all(list.map((k) => loaders[k]()));
    setState((s) => ({ ...s, ...Object.fromEntries(list.map((k, i) => [k, values[i]])) }));
  }, [loaders]);

  const loadAll = useCallback(() => {
    setStatus('loading');
    refresh().then(() => setStatus('ready')).catch((e) => { setError(e.message); setStatus('error'); });
  }, [refresh]);

  useEffect(() => {
    if (!user) { setState(EMPTY); return undefined; }
    loadAll();
    const t = setInterval(() => refresh('notifications').catch(() => {}), 60000);
    return () => clearInterval(t);
  }, [user, loadAll, refresh]);

  const actions = useMemo(() => {
    /** Runs an API call, refreshes the listed resources and reports errors as a toast. Resolves to the result or null. */
    const run = async (fn, keys = ['cases', 'notifications']) => {
      try {
        const result = await fn();
        await refresh(...keys);
        return result ?? true;
      } catch (e) {
        toast(e.message, 'warning');
        return null;
      }
    };
    const item = (itemId, body) => run(() => api.put(`/readiness/${itemId}`, body));
    return {
      completeItem: (_caseId, itemId, note = '') => item(itemId, { action: 'complete', note }),
      startItem: (_caseId, itemId) => item(itemId, { action: 'start' }),
      returnItem: (_caseId, itemId, reason) => item(itemId, { action: 'return', reason }),
      waiveItem: (_caseId, itemId, reason) => item(itemId, { action: 'not_required', reason }),
      reopenItem: (_caseId, itemId) => item(itemId, { action: 'reopen' }),
      editItem: (itemId, fields) => item(itemId, { action: 'edit', ...fields }),
      addItem: (caseId, data) => run(() => api.post('/readiness', { procedureId: caseId, ...data })),
      patientCompleteTask: (_caseId, itemId, file) => {
        const form = new FormData();
        if (file) form.append('file', file);
        return run(() => api.upload(`/readiness/${itemId}/submission`, form));
      },
      patientConfirmAttendance: (caseId) => run(() => api.post(`/procedures/${caseId}/confirm-attendance`, {})),
      saveAssessment: (caseId, form) => run(() => api.put(`/procedures/${caseId}/assessment`, form)),
      transition: async (caseId, action, payload = {}) => {
        try {
          await api.post(`/procedures/${caseId}/transitions/${action}`, payload);
          await refresh('cases', 'notifications');
          return { ok: true };
        } catch (e) {
          return { ok: false, reason: e.message };
        }
      },
      updateCase: (caseId, fields) => run(() => api.put(`/procedures/${caseId}`, fields)),
      submitCheckin: async (caseId, data, photo) => {
        const form = new FormData();
        Object.entries({ ...data, procedureId: caseId }).forEach(([k, v]) => {
          if (Array.isArray(v)) v.forEach((x) => form.append(k, x));
          else if (v !== undefined && v !== null) form.append(k, String(v));
        });
        if (photo) form.append('photo', photo);
        return run(() => api.upload('/recovery', form));
      },
      respondAlert: (caseId, alertId, status, response) => run(() => api.put(`/procedures/${caseId}/alerts/${alertId}`, { status, response })),
      sendMessage: (caseId, text) => run(() => api.post(`/procedures/${caseId}/messages`, { text })),
      createCase: async (data) => {
        const created = await run(() => api.post('/procedures', data), ['cases', 'patients', 'notifications']);
        return created?.id || null;
      },
      createPatient: (data) => run(() => api.post('/patients', data), ['patients']),
      updatePatient: (id, data) => run(() => api.put(`/patients/${id}`, data), ['patients']),
      markRead: (id) => run(() => api.put(`/notifications/${id}/read`, {}), ['notifications']),
      markAllRead: () => run(() => api.put('/notifications/read-all', {}), ['notifications']),
      addUser: (data) => run(() => api.post('/users', data), ['users', 'audit']),
      toggleUser: (id, active) => run(() => api.patch(`/users/${id}`, { active }), ['users', 'audit']),
      approveUser: (id) => run(() => api.patch(`/users/${id}`, { approval: 'approved' }), ['users', 'audit', 'notifications']),
      saveTemplate: (t) => run(() => api.put(`/procedure-types/${t.id}`, t), ['templates', 'audit']),
      saveRules: (rules) => run(() => api.put('/settings/rules', rules), ['rules', 'audit']),
      runDailyChecks: () => run(() => api.post('/admin/daily-checks', {}), ['cases', 'notifications', 'audit']),
      refresh,
    };
  }, [refresh, toast]);

  const value = useMemo(() => ({ state, actions, status }), [state, actions, status]);
  if (user && status === 'loading' && !state.cases.length) return <LoadingState fullPage label="Loading MedSync…" />;
  if (user && status === 'error') return <ErrorState fullPage message={error} onRetry={loadAll} />;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
