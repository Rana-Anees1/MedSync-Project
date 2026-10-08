export const firstName = (name) => name.replace(/^(Dr\.|Nurse)\s+/i, '').split(' ')[0];

/** Not tied to the clock, because the demo calendar can be moved forward. */
export const greeting = (name) => `Welcome back, ${name.startsWith('Dr.') ? `Dr. ${firstName(name)}` : firstName(name)}`;
