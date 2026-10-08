import { useMemo } from 'react';
import { useStore } from './StoreContext';
import { readinessSummary } from '../services/workflow';

/** Store actions (each calls the REST API). */
export function useActions() {
  return useStore().actions;
}

/** Commonly needed lookups, computed from the current state. */
export function useLookup() {
  const { state } = useStore();
  return useMemo(() => {
    const patient = (id) => state.patients.find((p) => p.id === id);
    const user = (id) => state.users.find((u) => u.id === id);
    const template = (id) => state.templates.find((t) => t.id === id);
    const enrich = (c) => ({ ...c, patient: patient(c.patientId) || { name: 'Unknown patient', comorbidities: [] }, surgeon: user(c.surgeonId), readiness: readinessSummary(c), risk: c.risk });
    return { patient, user, template, enrich, today: state.sim.today, rules: state.rules };
  }, [state]);
}

export function useEnrichedCases() {
  const { state } = useStore();
  const { enrich } = useLookup();
  return useMemo(() => state.cases.map(enrich), [state.cases, enrich]);
}

export function useMyNotifications() {
  return useStore().state.notifications;
}
