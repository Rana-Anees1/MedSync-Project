import { describe, it, expect } from 'vitest';
import { cancellationRisk, complicationRisk, recoveryPlanFor } from '../src/domain/riskEngine.js';
import { generatePlan } from '../src/domain/planGenerator.js';
import { addDays } from '../src/domain/date.js';
import { T, rules, tpl, patient } from './helpers.js';

const base = () => ({
  status: 'PREPARATION',
  surgeryDate: addDays(T, 3),
  lastPatientActivity: T,
  confirmations: {},
  labs: { abnormal: [] },
  items: generatePlan({ template: tpl('tpl_hernia'), patient: patient(), surgeryDate: addDays(T, 3), today: addDays(T, -7), rules }),
});

describe('Risk engine (prototype stand-in for the ML service)', () => {
  it('UT-15 returns no cancellation risk for a case that is not in pre-operative preparation', () => {
    expect(cancellationRisk({ ...base(), status: 'RECOVERY' }, patient(), T, rules)).toBeNull();
  });

  it('UT-16 returns a probability between 0 and 1 with a level and explanatory factors', () => {
    const r = cancellationRisk(base(), patient(), T, rules);
    expect(r.probability).toBeGreaterThan(0);
    expect(r.probability).toBeLessThan(1);
    expect(['low', 'medium', 'high']).toContain(r.level);
    expect(Array.isArray(r.factors)).toBe(true);
  });

  it('UT-17 increases cancellation risk when readiness items become overdue', () => {
    const ok = base();
    const late = base();
    late.items = late.items.map((i, n) => (n < 2 ? { ...i, status: 'overdue' } : i));
    expect(cancellationRisk(late, patient(), T, rules).probability).toBeGreaterThan(cancellationRisk(ok, patient(), T, rules).probability);
  });

  it('UT-18 lowers cancellation risk once the patient confirms attendance', () => {
    const c = base();
    const confirmed = { ...base(), confirmations: { patient: T } };
    expect(cancellationRisk(confirmed, patient(), T, rules).probability).toBeLessThan(cancellationRisk(c, patient(), T, rules).probability);
  });

  it('UT-19 assigns a higher complication tier to an older diabetic smoker', () => {
    const c = { operation: { durationMin: 120 }, labs: { abnormal: [] } };
    const low = complicationRisk(c, patient({ age: 30 }), tpl('tpl_hernia'));
    const high = complicationRisk(c, patient({ age: 68, comorbidities: ['Diabetes'], smoker: true, bmi: 33 }), tpl('tpl_hernia'));
    expect(high.probability).toBeGreaterThan(low.probability);
    expect(high.tier).toBe('high');
  });

  it('UT-20 maps each complication tier to the configured monitoring plan', () => {
    expect(recoveryPlanFor('high', rules)).toMatchObject({ threshold: 3, everyDays: 1, days: 14 });
    expect(recoveryPlanFor('low', rules)).toMatchObject({ threshold: 5, everyDays: 2, days: 7 });
  });
});
