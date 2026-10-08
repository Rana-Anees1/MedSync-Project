import { describe, it, expect } from 'vitest';
import { generatePlan, rescheduleItems } from '../src/domain/planGenerator.js';
import { addDays } from '../src/domain/date.js';
import { T, rules, tpl, patient } from './helpers.js';

describe('Readiness plan generator', () => {
  it('UT-01 creates one item per template item for a patient without comorbidities', () => {
    const items = generatePlan({ template: tpl('tpl_hernia'), patient: patient(), surgeryDate: addDays(T, 10), today: T, rules });
    expect(items).toHaveLength(tpl('tpl_hernia').items.length);
  });

  it('UT-02 counts each deadline back from the surgery date', () => {
    const surgery = addDays(T, 10);
    const items = generatePlan({ template: tpl('tpl_hernia'), patient: patient(), surgeryDate: surgery, today: T, rules });
    const cbc = items.find((i) => i.key === 'cbc');
    expect(cbc.deadline).toBe(addDays(surgery, -5));
    expect(items.find((i) => i.key === 'fasting').deadline).toBe(surgery);
  });

  it('UT-03 never sets a deadline earlier than the listing date', () => {
    const items = generatePlan({ template: tpl('tpl_hernia'), patient: patient(), surgeryDate: addDays(T, 3), today: T, rules });
    items.forEach((i) => expect(i.deadline >= T).toBe(true));
  });

  it('UT-04 adds condition-based items for diabetes and hypertension', () => {
    const items = generatePlan({ template: tpl('tpl_hernia'), patient: patient({ comorbidities: ['Diabetes', 'Hypertension'] }), surgeryDate: addDays(T, 10), today: T, rules });
    expect(items.map((i) => i.key)).toEqual(expect.arrayContaining(['hba1c', 'cardio']));
    expect(items.find((i) => i.key === 'hba1c').reason).toMatch(/diabetes/);
  });

  it('UT-05 returns items sorted by deadline with every item pending', () => {
    const items = generatePlan({ template: tpl('tpl_lapchole'), patient: patient(), surgeryDate: addDays(T, 12), today: T, rules });
    const dates = items.map((i) => i.deadline);
    expect([...dates].sort()).toEqual(dates);
    items.forEach((i) => expect(i.status).toBe('pending'));
  });

  it('UT-06 reschedules open items to a new date but keeps completed items', () => {
    const items = generatePlan({ template: tpl('tpl_hernia'), patient: patient(), surgeryDate: addDays(T, 10), today: T, rules });
    items[0].status = 'completed';
    items[1].status = 'overdue';
    const moved = rescheduleItems(items, addDays(T, 20), T);
    expect(moved[0].status).toBe('completed');
    expect(moved[1].status).toBe('pending');
    expect(moved[1].deadline).toBe(addDays(T, 20 - items[1].offsetDays));
  });
});
