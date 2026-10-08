/**
 * Thin REST client for the MedSync Express API.
 * The base URL comes from VITE_API_URL (see frontend/.env.example).
 */
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const TOKEN_KEY = 'medsync-token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function request(method, path, { body, form, auth = true } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(API_URL + path, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError(0, `Cannot reach the MedSync server at ${API_URL}. Is the backend running?`);
  }
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok || json?.success === false) {
    if (res.status === 401 && auth && token) onUnauthorized();
    const details = json?.error?.details;
    const msg = json?.error?.message || `Request failed (${res.status})`;
    throw new ApiError(res.status, details ? `${msg}: ${Object.values(details).join(', ')}` : msg, details);
  }
  return json?.data;
}

export const api = {
  get: (p, o) => request('GET', p, o),
  post: (p, body, o) => request('POST', p, { ...o, body }),
  put: (p, body, o) => request('PUT', p, { ...o, body }),
  patch: (p, body, o) => request('PATCH', p, { ...o, body }),
  upload: (p, form) => request('POST', p, { form }),
};

/** Opens a protected uploaded file (reports, wound photos) in a new tab using the auth token. */
export async function openProtectedFile(url) {
  const res = await fetch(API_URL + url, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
  if (!res.ok) throw new ApiError(res.status, 'File could not be opened');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank', 'noopener');
}
