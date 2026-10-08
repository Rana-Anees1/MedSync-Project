import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore, setUnauthorizedHandler } from '../services/api';

/** Real authentication: JWT stored in localStorage, current user loaded from /api/users/me. */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(tokenStore.get()));
  const [sessionMessage, setSessionMessage] = useState('');

  const logout = useCallback((message = '') => {
    tokenStore.clear();
    setUser(null);
    setSessionMessage(message);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout('Your session has expired. Please sign in again.'));
    if (!tokenStore.get()) return;
    api.get('/users/me').then((d) => setUser(d.user)).catch(() => logout()).finally(() => setChecking(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', { email, password }, { auth: false });
    tokenStore.set(d.token);
    setSessionMessage('');
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (payload) => {
    const d = await api.post('/auth/register', payload, { auth: false });
    if (d.token) { tokenStore.set(d.token); setUser(d.user); }
    return d;
  }, []);

  const value = useMemo(() => ({ user, checking, login, register, logout: () => logout(), sessionMessage }), [user, checking, login, register, logout, sessionMessage]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
