// All dates in the prototype are plain 'YYYY-MM-DD' strings on a simulated hospital calendar.
const parse = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const toISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const todayISO = () => toISO(new Date());

export const addDays = (iso, n) => new Date(parse(iso) + n * 86400000).toISOString().slice(0, 10);

/** a - b in whole days */
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);

export const maxDate = (a, b) => (diffDays(a, b) >= 0 ? a : b);

export const formatDate = (iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  iso ? new Date(parse(iso)).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' }) : '—';

export const formatLong = (iso) =>
  formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const relativeDay = (iso, today) => {
  const d = diffDays(iso, today);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  return d > 0 ? `In ${d} days` : `${-d} days ago`;
};

/** Countdown label used across staff screens, e.g. "4 days to go" */
export const countdown = (surgeryDate, today) => {
  const d = diffDays(surgeryDate, today);
  if (d === 0) return 'Surgery today';
  if (d === 1) return '1 day to go';
  if (d > 1) return `${d} days to go`;
  return `${-d} days ago`;
};
