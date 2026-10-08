import { describe, it, expect } from 'vitest';
import { canTransition, readinessSummary, availableActions } from '../src/domain/workflow.js';
import { generatePlan } from '../src/domain/planGenerator.js';
import { addDays } from '../src/domain/date.js';
import { T, rules, tpl, patient } from './helpers.js';

const makeCase = (over = {}) => ({
  status: 'PREPARATION',
  surgeryDate: addDays(T, 5),
  assessment: null,
  items: generatePlan({ template: tpl('tpl_appendix'), patient: patient(), surgeryDate: addDays(T, 5), today: T, rules }),
  ...over,
});
const finishAll = (c) => ({ ...c, items: c.items.map((i) => (i.dayOf ? i : { ...i, status: 'completed' })) });

describe('Case lifecycle state machine', () => {
  it('UT-07 blocks clearance when no anaesthesia assessment is recorded', () => {
    const r = canTransition(finishAll(makeCase()), 'clear', 'anaesthetist', T, rules);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/assessment/i);
  });

  it('UT-08 blocks clearance while a required item is still open', () => {
    const r = canTransition(makeCase({ assessment: { asa: 'ASA I' } }), 'clear', 'anaesthetist', T, rules);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/required item/);
  });

  it('UT-09 allows clearance when the assessment exists and required items are done', () => {
    const c = finishAll(makeCase({ assessment: { asa: 'ASA I' } }));
    expect(canTransition(c, 'clear', 'anaesthetist', T, rules).ok).toBe(true);
  });

  it('UT-10 rejects a transition by an unauthorised role', () => {
    const c = finishAll(makeCase({ assessment: { asa: 'ASA I' } }));
    expect(canTransition(c, 'clear', 'coordinator', T, rules).ok).toBe(false);
  });

  it('UT-11 opens OT-list confirmation only inside the confirmation window', () => {
    const far = makeCase({ status: 'READY', surgeryDate: addDays(T, 5) });
    const near = makeCase({ status: 'READY', surgeryDate: addDays(T, 2) });
    expect(canTransition(far, 'confirm', 'coordinator', T, rules).ok).toBe(false);
    expect(canTransition(near, 'confirm', 'coordinator', T, rules).ok).toBe(true);
  });

  it('UT-12 allows recording the operation only on or after the surgery date', () => {
    const before = makeCase({ status: 'SCHEDULED', surgeryDate: addDays(T, 1) });
    const onDay = makeCase({ status: 'SCHEDULED', surgeryDate: T });
    expect(canTransition(before, 'operate', 'surgeon', T, rules).ok).toBe(false);
    expect(canTransition(onDay, 'operate', 'surgeon', T, rules).ok).toBe(true);
  });

  it('UT-13 does not offer actions that are invalid for the current state', () => {
    const actions = availableActions(makeCase({ status: 'RECOVERY' }), 'surgeon', T, rules).map((a) => a.action);
    expect(actions).toEqual(['recover']);
  });

  it('UT-14 summarises readiness and excludes day-of-surgery items from clearance blockers', () => {
    const s = readinessSummary(finishAll(makeCase()));
    expect(s.blockers.length).toBe(0);
    expect(s.done).toBe(s.total - 1);
  });
});
