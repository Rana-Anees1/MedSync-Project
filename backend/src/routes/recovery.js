import { Router } from 'express';
import Procedure from '../models/Procedure.js';
import RecoveryCheckIn from '../models/RecoveryCheckIn.js';
import { requireAuth, allow } from '../middleware/auth.js';
import { upload, fileMeta } from '../middleware/upload.js';
import { asyncHandler, ok, ApiError, assert } from '../utils/http.js';
import { notify, logActivity } from '../services/notify.js';
import { checkinDto } from '../services/caseDto.js';
import { scoreCheckin, isWorsening } from '../domain/recoveryScoring.js';
import { todayISO } from '../domain/date.js';
import { RECOVERY_STATES } from '../domain/constants.js';

const r = Router();
r.use(requireAuth);
export const REVIEW_NOTICE = 'MedSync does not diagnose. Concerning answers are flagged for review by your surgical team; in an emergency go to the Emergency department or call Rescue 1122.';
const bool = (v) => v === true || v === 'true';

r.post('/', allow('patient'), upload.single('photo'), asyncHandler(async (req, res) => {
  const b = req.body || {};
  const p = await Procedure.findOne({ patient: req.user.patient, stage: { $in: RECOVERY_STATES }, ...(b.procedureId ? { _id: b.procedureId } : {}) });
  if (!p) throw new ApiError(400, 'Recovery check-ins start after you are discharged from hospital');
  const symptoms = Array.isArray(b.symptoms) ? b.symptoms : b.symptoms ? String(b.symptoms).split(',').filter(Boolean) : [];
  const data = {
    generalStatus: b.generalStatus, symptoms, temp: Number(b.temp), pain: Number(b.pain), wound: b.wound, eating: b.eating, mobility: b.mobility,
    drain: b.drain === '' || b.drain == null ? undefined : Number(b.drain), bleeding: bool(b.bleeding), breathless: bool(b.breathless), notes: (b.notes || '').slice(0, 2000),
  };
  assert(Number.isFinite(data.temp) && data.temp >= 34 && data.temp <= 43, 400, 'Enter a temperature between 34 and 43 °C');
  assert(Number.isInteger(data.pain) && data.pain >= 0 && data.pain <= 10, 400, 'Pain must be between 0 and 10');
  const result = scoreCheckin(data);
  const today = todayISO();
  const history = await RecoveryCheckIn.find({ procedure: p._id }).sort({ date: 1, createdAt: 1 }).lean();
  const worsening = isWorsening([...history, { score: result.score }]);
  const threshold = p.discharge.plan.threshold;
  const alertType = result.redFlag ? 'redflag' : worsening ? 'trend' : result.score >= threshold ? 'threshold' : null;
  const ci = await RecoveryCheckIn.create({ ...data, procedure: p._id, patient: p.patient, date: today, photo: fileMeta(req.file), ...result });
  p.lastPatientActivity = today;
  p.flags = { ...(p.flags || {}), silent: false }; p.markModified('flags');
  if (p.stage === 'DISCHARGED') p.stage = 'RECOVERY';
  logActivity(p, req.user, `Submitted recovery check-in (score ${result.score})`);
  if (alertType) {
    const severity = alertType === 'redflag' ? 'critical' : alertType === 'trend' ? 'high' : 'medium';
    const message = alertType === 'redflag' ? `Red flag: ${result.reasons.join(', ')}. Patient advised to go to Emergency.`
      : alertType === 'trend' ? `Worsening for 3 check-ins in a row: ${result.reasons.join(', ')}`
        : `Score ${result.score} reached the alert threshold (${threshold}): ${result.reasons.join(', ')}`;
    p.alerts.push({ date: today, type: alertType, severity, message, checkIn: ci._id, status: 'open' });
    logActivity(p, 'MedSync', `Recovery alert sent for review (${severity})`);
    await notify({ to: { user: p.surgeon }, kind: 'alert', procedure: p, title: `${severity === 'critical' ? 'Urgent: ' : ''}Recovery alert for ${req.user.name}`, body: message });
    if (severity === 'critical') await notify({ to: { role: 'coordinator' }, kind: 'alert', procedure: p, title: `Urgent review: ${req.user.name}`, body: message });
  }
  await p.save();
  ok(res, { checkIn: checkinDto(ci), redFlag: result.redFlag, alertType, reasons: result.reasons, notice: REVIEW_NOTICE }, 201);
}));

r.get('/:patientId', asyncHandler(async (req, res) => {
  const own = req.user.role === 'patient' && req.user.patient?.toString() === req.params.patientId;
  if (!own && !['surgeon', 'anaesthetist', 'coordinator'].includes(req.user.role)) throw new ApiError(403, 'Not allowed');
  const list = await RecoveryCheckIn.find({ patient: req.params.patientId }).sort({ date: -1, createdAt: -1 });
  ok(res, list.map(checkinDto));
}));
export default r;
