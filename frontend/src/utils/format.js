export const pct = (v) => `${Math.round(v * 100)}%`;

export const initials = (name = '') =>
  name
    .replace(/^(Dr\.|Nurse)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const plural = (n, word, pluralWord) => `${n} ${n === 1 ? word : pluralWord || `${word}s`}`;
