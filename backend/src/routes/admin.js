import { Router } from 'express';
import Setting from '../models/Setting.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, allow } from '../middleware/auth.js';
import { asyncHandler, ok, assert } from '../utils/http.js';
import { getRules } from '../services/rules.js';
import { audit } from '../services/notify.js';
import { runDailyChecks } from '../services/dailyChecks.js';
import { aiStatus } from '../services/ai/riskProvider.js';

const r = Router();
r.use(requireAuth);
r.get('/settings/rules', allow('admin', 'surgeon', 'anaesthetist', 'coordinator'), asyncHandler(async (_req, res) => ok(res, await getRules())));
r.put('/settings/rules', allow('admin'), asyncHandler(async (req, res) => {
  const rules = req.body || {};
  assert(Array.isArray(rules.reminderDaysBefore) && rules.recovery?.high && rules.risk, 400, 'Invalid rules document');
  assert(rules.risk.high > rules.risk.medium && rules.risk.high < 1 && rules.risk.medium > 0, 400, 'Risk thresholds must satisfy 0 < watch < high < 100%');
  const s = await Setting.findOneAndUpdate({ key: 'rules' }, { rules }, { new: true, upsert: true });
  await audit(req.user, 'Updated reminder & alert rules');
  ok(res, s.rules);
}));
r.get('/audit', allow('admin'), asyncHandler(async (_req, res) => {
  const list = await AuditLog.find().sort({ createdAt: -1 }).limit(500).lean();
  ok(res, list.map((a) => ({ id: a._id.toString(), date: a.date, actor: a.actorName, action: a.action, target: a.target, createdAt: a.createdAt })));
}));
r.post('/admin/daily-checks', allow('admin'), asyncHandler(async (req, res) => ok(res, await runDailyChecks({ actor: req.user }))));
r.get('/ai/status', asyncHandler(async (_req, res) => ok(res, aiStatus())));
export default r;
