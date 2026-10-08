import { diffDays } from './date.js';
import { PREOP_STATES } from './constants.js';

const isClosed = (it) => it.status === 'completed' || it.status === 'not_required';

export function readinessSummary(c) {
  const items = c.items || [];
  const total = items.length;
  const done = items.filter(isClosed).length;
  const overdue = items.filter((i) => i.status === 'overdue').length;
  const submitted = items.filter((i) => i.status === 'in_progress').length;
  const pendingMandatory = items.filter((i) => i.mandatory && !isClosed(i)).length;
  const blockers = items.filter((i) => i.mandatory && !i.dayOf && i.key !== 'anaesth' && !isClosed(i));
  return { total, done, pct: total ? done / total : 0, overdue, submitted, pendingMandatory, blockers };
}

export const isPreop = (c) => PREOP_STATES.includes(c.status);

/**
 * Lifecycle state machine. Every transition has a guard and a role.
 * canTransition() is used to enable/disable buttons and to explain why an action is blocked.
 */
export const TRANSITIONS = {
  clear: { from: ['LISTED', 'PREPARATION'], to: 'READY', roles: ['anaesthetist'], label: 'Clear for surgery' },
  defer: { from: ['LISTED', 'PREPARATION', 'READY', 'SCHEDULED'], to: 'DEFERRED', roles: ['anaesthetist', 'surgeon'], label: 'Defer case' },
  resume: { from: ['DEFERRED'], to: 'PREPARATION', roles: ['coordinator', 'surgeon'], label: 'Resume workup' },
  confirm: { from: ['READY'], to: 'SCHEDULED', roles: ['coordinator'], label: 'Confirm for OT list' },
  cancel: { from: ['LISTED', 'PREPARATION', 'READY', 'SCHEDULED'], to: 'CANCELLED', roles: ['coordinator', 'surgeon'], label: 'Record cancellation' },
  operate: { from: ['SCHEDULED'], to: 'COMPLETED', roles: ['surgeon'], label: 'Record operation' },
  discharge: { from: ['COMPLETED'], to: 'DISCHARGED', roles: ['surgeon'], label: 'Discharge & start recovery watch' },
  recover: { from: ['DISCHARGED', 'RECOVERY'], to: 'RECOVERED', roles: ['surgeon'], label: 'Close as recovered' },
};

export function canTransition(c, action, role, today, rules) {
  const t = TRANSITIONS[action];
  if (!t) return { ok: false, reason: 'Unknown action' };
  if (!t.roles.includes(role)) return { ok: false, reason: `Only ${t.roles.join(' or ')} can do this`, hidden: true };
  if (!t.from.includes(c.status)) return { ok: false, reason: 'Not available at this stage', hidden: true };

  const days = diffDays(c.surgeryDate, today);
  if (action === 'clear') {
    const { blockers } = readinessSummary(c);
    if (!c.assessment) return { ok: false, reason: 'Record the pre-anaesthesia assessment first' };
    if (blockers.length) return { ok: false, reason: `${blockers.length} required item(s) still open: ${blockers.map((b) => b.title).join(', ')}` };
  }
  if (action === 'confirm' && days > (rules?.confirmWithinDays ?? 2)) {
    return { ok: false, reason: `Confirmation opens ${rules?.confirmWithinDays ?? 2} days before surgery` };
  }
  if (action === 'operate' && days > 0) return { ok: false, reason: 'Available on the day of surgery' };
  return { ok: true };
}

export function availableActions(c, role, today, rules) {
  return Object.keys(TRANSITIONS)
    .map((action) => ({ action, ...TRANSITIONS[action], ...canTransition(c, action, role, today, rules) }))
    .filter((a) => !a.hidden);
}
