import { Router } from 'express';
import Procedure from '../models/Procedure.js';
import ReadinessItem from '../models/ReadinessItem.js';
import RecoveryCheckIn from '../models/RecoveryCheckIn.js';
import { requireAuth, allow } from '../middleware/auth.js';
import { asyncHandler, ok } from '../utils/http.js';
import { loadCases } from '../services/caseDto.js';
import { PREOP_STATES, STAGES } from '../domain/constants.js';
import { addDays, todayISO } from '../domain/date.js';

const r = Router();
r.use(requireAuth, allow('admin', 'surgeon', 'anaesthetist', 'coordinator'));

/** All figures are computed from the database at request time. */
r.get('/', asyncHandler(async (_req, res) => {
  const today = todayISO();
  const since = addDays(today, -13);
  const [stageAgg, preopCases, itemAgg, cancelAgg, ciAgg, alertAgg, totalProcedures] = await Promise.all([
    Procedure.aggregate([{ $group: { _id: '$stage', n: { $sum: 1 } } }]),
    loadCases({ stage: { $in: PREOP_STATES } }),
    ReadinessItem.aggregate([
      { $lookup: { from: 'procedures', localField: 'procedure', foreignField: '_id', as: 'p' } },
      { $match: { 'p.stage': { $in: PREOP_STATES } } },
      { $group: { _id: { status: '$status', priority: '$priority' }, n: { $sum: 1 } } },
    ]),
    Procedure.aggregate([{ $match: { stage: 'CANCELLED' } }, { $group: { _id: '$cancellation.category', n: { $sum: 1 } } }]),
    RecoveryCheckIn.aggregate([{ $match: { date: { $gte: since } } }, { $group: { _id: '$date', n: { $sum: 1 }, red: { $sum: { $cond: ['$redFlag', 1, 0] } } } }]),
    Procedure.aggregate([{ $unwind: '$alerts' }, { $group: { _id: { type: '$alerts.type', status: '$alerts.status' }, n: { $sum: 1 } } }]),
    Procedure.countDocuments(),
  ]);
  const stages = Object.fromEntries(STAGES.map((s) => [s, 0]));
  stageAgg.forEach((s) => { stages[s._id] = s.n; });
  const items = { pending: 0, in_progress: 0, completed: 0, overdue: 0, not_required: 0 };
  let highOpen = 0;
  itemAgg.forEach((g) => { items[g._id.status] += g.n; if (g._id.priority === 'high' && ['pending', 'overdue', 'in_progress'].includes(g._id.status)) highOpen += g.n; });
  const totalItems = Object.values(items).reduce((a, b) => a + b, 0);
  const days = Array.from({ length: 14 }, (_, i) => addDays(since, i));
  const ciMap = Object.fromEntries(ciAgg.map((c) => [c._id, c]));
  const risk = { high: 0, medium: 0, low: 0 };
  preopCases.forEach((c) => { if (c.risk) risk[c.risk.level] += 1; });
  ok(res, {
    generatedAt: new Date().toISOString(), today, totalProcedures, stages,
    readiness: { totalItems, byStatus: items, completionRate: totalItems ? (items.completed + items.not_required) / totalItems : null, highPriorityOpen: highOpen },
    upcoming: { next7Days: preopCases.filter((c) => c.surgeryDate >= today && c.surgeryDate <= addDays(today, 7)).length, next14Days: preopCases.filter((c) => c.surgeryDate >= today && c.surgeryDate <= addDays(today, 14)).length },
    readinessByCase: preopCases.map((c) => ({ id: c.id, procedureName: c.procedureName, surgeryDate: c.surgeryDate, patientId: c.patientId, total: c.items.length, done: c.items.filter((i) => ['completed', 'not_required'].includes(i.status)).length, overdue: c.items.filter((i) => i.status === 'overdue').length, risk: c.risk?.level || null })),
    risk: { ...risk, method: 'rule-based (not a machine-learning model)' },
    cancellations: cancelAgg.map((c) => ({ category: c._id || 'Not recorded', n: c.n })),
    recovery: {
      checkinsByDay: days.map((d) => ({ date: d, n: ciMap[d]?.n || 0, redFlags: ciMap[d]?.red || 0 })),
      checkinsLast14Days: ciAgg.reduce((a, c) => a + c.n, 0),
      alerts: alertAgg.map((a) => ({ type: a._id.type, status: a._id.status, n: a.n })),
    },
  });
}));
export default r;
