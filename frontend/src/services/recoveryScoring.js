/**
 * Scores a post-discharge check-in. Thresholds are configurable per monitoring tier (Admin > Rules).
 * Red flags bypass scoring: the patient is told to come to Emergency immediately.
 */
export function scoreCheckin(ci) {
  let score = 0;
  let redFlag = false;
  const reasons = [];
  const add = (n, why) => {
    score += n;
    reasons.push(why);
  };

  const t = Number(ci.temp);
  if (t >= 39) { redFlag = true; add(3, `Temperature ${t}°C`); }
  else if (t >= 38) add(2, `Fever ${t}°C`);
  else if (t >= 37.6) add(1, `Raised temperature ${t}°C`);

  const p = Number(ci.pain);
  if (p >= 8) add(3, `Severe pain (${p}/10)`);
  else if (p >= 6) add(2, `Moderate pain (${p}/10)`);
  else if (p >= 4) add(1, `Pain ${p}/10`);

  const wound = { red: [1, 'Redness around wound'], swollen: [2, 'Wound swelling'], discharge: [3, 'Discharge from wound'] };
  if (wound[ci.wound]) add(...wound[ci.wound]);
  if (ci.wound === 'opened') { redFlag = true; add(4, 'Wound has opened'); }

  if (ci.bleeding) { redFlag = true; reasons.push('Bleeding from wound'); }
  if (ci.breathless) { redFlag = true; reasons.push('Breathlessness or chest pain'); }
  if (ci.eating === 'reduced') add(1, 'Eating less than usual');
  if (ci.eating === 'none') add(2, 'Not able to eat or drink');
  if (ci.mobility === 'bedbound') add(2, 'Unable to get out of bed');
  if (Number(ci.drain) > 150) add(2, `High drain output (${ci.drain} ml)`);

  return { score, redFlag, reasons };
}

/** Worsening trend: last three scores strictly rising and the latest is at least 2. */
export function isWorsening(checkins) {
  const s = checkins.slice(-3).map((c) => c.score);
  return s.length === 3 && s[0] < s[1] && s[1] < s[2] && s[2] >= 2;
}

export const WOUND_OPTIONS = [
  { value: 'normal', label: 'Looks normal', ur: 'ٹھیک ہے' },
  { value: 'red', label: 'Red around the edges', ur: 'کناروں پر سرخی' },
  { value: 'swollen', label: 'Swollen', ur: 'سوجن' },
  { value: 'discharge', label: 'Fluid or pus coming out', ur: 'پانی یا پیپ نکل رہی ہے' },
  { value: 'opened', label: 'Wound has opened', ur: 'زخم کھل گیا ہے' },
];
