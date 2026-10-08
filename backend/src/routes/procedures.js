import { Router } from 'express';
import Procedure from '../models/Procedure.js';
import ProcedureType from '../models/ProcedureType.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import ReadinessItem from '../models/ReadinessItem.js';
import RiskAssessment from '../models/RiskAssessment.js';
import { requireAuth, allow } from '../middleware/auth.js';
import { asyncHandler, ok, ApiError, assert } from '../utils/http.js';
import { notify, audit, logActivity, patientUserOf } from '../services/notify.js';
import { loadCases, loadCase, toDto, patientRiskInput } from '../services/caseDto.js';
import { getProcedureFor, caseFilterFor } from '../services/access.js';
import { getRules } from '../services/rules.js';
import { generatePlan, rescheduleItems } from '../domain/planGenerator.js';
import { canTransition } from '../domain/workflow.js';
import { estimateCancellation, estimateComplication, ruleBased } from '../services/ai/riskProvider.js';
import { addDays, todayISO, formatDate, diffDays } from '../domain/date.js';
import { CANCELLATION_CATEGORIES } from '../domain/constants.js';

const r = Router();
r.use(requireAuth);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

r.get('/', asyncHandler(async (req, res) => {
  const filter = caseFilterFor(req.user);
  if (req.query.stage) filter.stage = { $in: String(req.query.stage).split(',') };
  if (req.query.surgeon) filter.surgeon = req.query.surgeon;
  if (req.query.patient && req.user.role !== 'patient') filter.patient = req.query.patient;
  ok(res, await loadCases(filter));
}));

r.post('/', allow('surgeon', 'coordinator'), asyncHandler(async (req, res) => {
  const { patientId, procedureTypeId, surgeryDate, surgeonId, anaesthetistId, coordinatorId } = req.body || {};
  const today = todayISO();
  assert(DATE.test(surgeryDate || ''), 400, 'Choose a surgery date');
  assert(surgeryDate >= addDays(today, 3), 400, 'Allow at least 3 days for preparation');
  const [patient, type, surgeon] = await Promise.all([Patient.findById(patientId), ProcedureType.findById(procedureTypeId), User.findOne({ _id: surgeonId, role: 'surgeon', active: true })]);
  assert(patient, 400, 'Select a registered patient');
  assert(type && type.active, 400, 'Select a procedure type');
  assert(surgeon, 400, 'Select the responsible surgeon');
  const open = await Procedure.exists({ patient: patient._id, stage: { $nin: ['RECOVERED', 'CANCELLED'] } });
  if (open) throw new ApiError(409, 'This patient already has an open procedure');
  const anaesthetist = anaesthetistId ? await User.findOne({ _id: anaesthetistId, role: 'anaesthetist' }) : await User.findOne({ role: 'anaesthetist', active: true, approval: 'approved' });
  const coordinator = coordinatorId ? await User.findOne({ _id: coordinatorId, role: 'coordinator' }) : null;
  const rules = await getRules();
  const plan = generatePlan({ template: type.toObject(), patient: patient.toObject(), surgeryDate, today, rules });
  const proc = await Procedure.create({
    patient: patient._id, procedureType: type._id, procedureName: type.name, surgeon: surgeon._id, anaesthetist: anaesthetist?._id, coordinator: coordinator?._id,
    listedOn: today, surgeryDate, stage: 'LISTED', lastPatientActivity: today,
    activity: [{ date: today, actor: req.user.name, text: `Listed for ${type.name} on ${surgeryDate}. Readiness plan created with ${plan.length} items.` }],
  });
  await ReadinessItem.insertMany(plan.map(({ id, completedBy, ...it }) => ({ ...it, procedure: proc._id })));
  await notify({ to: { role: 'anaesthetist' }, kind: 'info', procedure: proc, title: `New case for assessment: ${patient.name}`, body: `${type.name} on ${formatDate(surgeryDate)}` });
  await notify({ to: { role: 'coordinator' }, kind: 'info', procedure: proc, title: `New readiness plan: ${patient.name}`, body: `${plan.length} items to track` });
  if (!surgeon._id.equals(req.user._id)) await notify({ to: { user: surgeon._id }, kind: 'info', procedure: proc, title: `Patient listed under you: ${patient.name}`, body: type.name });
  const pu = await patientUserOf(patient._id);
  if (pu) await notify({ to: { user: pu }, kind: 'info', procedure: proc, title: 'Your preparation plan is ready', body: `Operation on ${formatDate(surgeryDate)}` });
  await audit(req.user, 'Listed patient for surgery', `${patient.name} · ${type.name}`);
  ok(res, await loadCase(proc._id), 201);
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const p = await getProcedureFor(req.user, req.params.id);
  ok(res, await loadCase(p._id));
}));

/** Update planned surgery date and/or responsible staff. */
r.put('/:id', allow('surgeon', 'coordinator'), asyncHandler(async (req, res) => {
  const p = await getProcedureFor(req.user, req.params.id);
  const { surgeryDate, surgeonId, anaesthetistId, coordinatorId } = req.body || {};
  const today = todayISO();
  const changes = [];
  if (surgeryDate && surgeryDate !== p.surgeryDate) {
    assert(['LISTED', 'PREPARATION', 'READY'].includes(p.stage), 400, 'The surgery date can only be changed before the case is scheduled');
    assert(DATE.test(surgeryDate) && surgeryDate > today, 400, 'Choose a future surgery date');
    p.surgeryDate = surgeryDate;
    const items = await ReadinessItem.find({ procedure: p._id });
    const moved = rescheduleItems(items.map((i) => i.toObject()), surgeryDate, today);
    await Promise.all(items.map((it, i) => Object.assign(it, { deadline: moved[i].deadline, status: moved[i].status, escalationLevel: moved[i].escalationLevel }).save()));
    p.flags = {}; p.markModified('flags');
    changes.push(`surgery date ${surgeryDate}`);
    const pu = await patientUserOf(p.patient);
    if (pu) await notify({ to: { user: pu }, kind: 'info', procedure: p, title: 'Your operation date has changed', body: `New date: ${formatDate(surgeryDate)}. Your preparation list has been updated.` });
  }
  for (const [field, id, role] of [['surgeon', surgeonId, 'surgeon'], ['anaesthetist', anaesthetistId, 'anaesthetist'], ['coordinator', coordinatorId, 'coordinator']]) {
    if (id && id !== p[field]?.toString()) {
      const u = await User.findOne({ _id: id, role, active: true });
      assert(u, 400, `Select a valid ${role}`);
      p[field] = u._id;
      changes.push(`${role}: ${u.name}`);
      await notify({ to: { user: u._id }, kind: 'info', procedure: p, title: `You were assigned to ${p.procedureName}`, body: `Surgery ${formatDate(p.surgeryDate)}` });
    }
  }
  if (changes.length) { logActivity(p, req.user, `Updated ${changes.join(', ')}`); await p.save(); await audit(req.user, 'Updated procedure', changes.join(', ')); }
  ok(res, await loadCase(p._id));
}));

r.get('/:id/risk', asyncHandler(async (req, res) => {
  const p = await getProcedureFor(req.user, req.params.id);
  const c = await loadCase(p._id);
  const patient = await Patient.findById(p.patient).lean();
  ok(res, await estimateCancellation(c, patientRiskInput(patient), todayISO(), await getRules()));
}));

/** Case lifecycle transitions, guarded by the shared state machine (domain/workflow.js). */
r.post('/:id/transitions/:action', asyncHandler(async (req, res) => {
  const p = await getProcedureFor(req.user, req.params.id);
  const { action } = req.params;
  const body = req.body || {};
  const today = todayISO();
  const rules = await getRules();
  const current = await loadCase(p._id);
  const check = canTransition(current, action, req.user.role, today, rules);
  if (!check.ok) throw new ApiError(check.hidden ? 403 : 409, check.reason);
  const patient = await Patient.findById(p.patient);
  const pu = await patientUserOf(p.patient);
  const tell = (title, text = '') => pu && notify({ to: { user: pu }, kind: 'info', procedure: p, title, body: text });

  switch (action) {
    case 'clear':
      p.stage = 'READY'; p.assessment.clearedBy = req.user._id; p.assessment.clearedOn = today;
      logActivity(p, req.user, 'Cleared for surgery');
      await tell('You are ready for your operation', `Please follow the fasting instructions for ${formatDate(p.surgeryDate)}.`);
      await notify({ to: { user: p.surgeon }, kind: 'info', procedure: p, title: `${patient.name} is ready for surgery`, body: p.procedureName });
      break;
    case 'defer':
      assert(body.reason && body.reason.trim(), 400, 'Enter the reason for deferral');
      assert(DATE.test(body.newDate || '') && body.newDate > today, 400, 'Choose a future proposed date');
      p.stage = 'DEFERRED'; p.deferral = { date: today, by: req.user._id, reason: body.reason.trim(), newDate: body.newDate };
      logActivity(p, req.user, `Deferred: ${body.reason.trim()}`);
      await tell('Your operation date has changed', `New proposed date: ${formatDate(body.newDate)}. Your team will contact you.`);
      await notify({ to: { role: 'coordinator' }, kind: 'info', procedure: p, title: `${patient.name} deferred`, body: body.reason.trim() });
      break;
    case 'resume': {
      p.surgeryDate = p.deferral?.newDate && p.deferral.newDate > today ? p.deferral.newDate : addDays(today, 7);
      const items = await ReadinessItem.find({ procedure: p._id });
      const moved = rescheduleItems(items.map((i) => i.toObject()), p.surgeryDate, today);
      await Promise.all(items.map((it, i) => Object.assign(it, { deadline: moved[i].deadline, status: moved[i].status, escalationLevel: moved[i].escalationLevel }).save()));
      p.stage = 'PREPARATION'; p.flags = {}; p.markModified('flags');
      logActivity(p, req.user, `Preparation resumed for ${p.surgeryDate}`);
      await tell('Your operation is rescheduled', `New date: ${formatDate(p.surgeryDate)}. Your preparation list has been updated.`);
      break;
    }
    case 'confirm':
      p.stage = 'SCHEDULED';
      logActivity(p, req.user, 'Scheduled on the OT list');
      await tell('Your operation is scheduled', `${formatDate(p.surgeryDate)}. Arrive at the admission desk by 7:00 am.`);
      await notify({ to: { user: p.surgeon }, kind: 'info', procedure: p, title: `${patient.name} scheduled for ${formatDate(p.surgeryDate)}`, body: p.procedureName });
      break;
    case 'cancel':
      assert(CANCELLATION_CATEGORIES.includes(body.category), 400, 'Choose a cancellation reason category');
      assert(body.reason && body.reason.trim(), 400, 'Describe what happened');
      p.stage = 'CANCELLED'; p.cancellation = { date: today, by: req.user._id, category: body.category, reason: body.reason.trim() };
      logActivity(p, req.user, `Cancelled: ${body.category}`);
      await tell('Your operation has been cancelled', 'Your surgical team will contact you to arrange a new date.');
      break;
    case 'operate':
      p.stage = 'COMPLETED'; p.operation = { date: today, durationMin: Math.max(10, Number(body.durationMin) || 60), notes: body.notes || '' };
      logActivity(p, req.user, `Operation recorded (${p.operation.durationMin} min)`);
      break;
    case 'discharge': {
      const type = await ProcedureType.findById(p.procedureType).lean();
      const dto = { ...current, operation: p.operation };
      const risk = await estimateComplication(dto, patientRiskInput(patient), type);
      const plan = ruleBased.plan(risk.tier, rules);
      const ra = await RiskAssessment.create({ procedure: p._id, kind: 'complication', probability: risk.probability, level: risk.tier, factors: risk.factors, model: risk.model, date: today });
      p.stage = 'DISCHARGED'; p.discharge = { date: today, plan, riskAssessment: ra._id };
      logActivity(p, 'MedSync', `Complication risk estimate ${Math.round(risk.probability * 100)}% (${risk.tier}, ${risk.model.type}). Check-ins every ${plan.everyDays === 1 ? 'day' : `${plan.everyDays} days`} for ${plan.days} days`);
      await tell('Your recovery check-ins have started', `Please complete a short check-in ${plan.everyDays === 1 ? 'every day' : `every ${plan.everyDays} days`}.`);
      break;
    }
    case 'recover':
      p.stage = 'RECOVERED'; p.closedOn = today;
      logActivity(p, req.user, 'Closed as recovered');
      await tell('Your recovery watch is complete', 'Contact the hospital if anything changes.');
      break;
    default:
      throw new ApiError(400, 'Unknown action');
  }
  await p.save();
  await audit(req.user, `Case action: ${action}`, `${patient.name} · ${p.procedureName}`);
  ok(res, await loadCase(p._id));
}));

r.put('/:id/assessment', allow('anaesthetist'), asyncHandler(async (req, res) => {
  const p = await getProcedureFor(req.user, req.params.id);
  assert(['LISTED', 'PREPARATION', 'READY', 'SCHEDULED'].includes(p.stage), 400, 'Assessment can only be recorded before surgery');
  const { asa, airway, fasting, medicineHolds, notes, abnormal } = req.body || {};
  assert(['ASA I', 'ASA II', 'ASA III', 'ASA IV'].includes(asa), 400, 'Choose an ASA grade');
  const today = todayISO();
  p.assessment = { ...(p.assessment || {}), date: today, by: req.user._id, asa, airway, fasting, medicineHolds, notes };
  if (typeof abnormal === 'string') p.labs = { abnormal: abnormal.split(',').map((s) => s.trim()).filter(Boolean) };
  await ReadinessItem.updateOne({ procedure: p._id, key: 'anaesth' }, { status: 'completed', completedOn: today, completedBy: req.user._id });
  if (p.stage === 'LISTED') p.stage = 'PREPARATION';
  logActivity(p, req.user, `Recorded pre-anaesthesia assessment (${asa})`);
  const text = [fasting && `Fasting: ${fasting}`, medicineHolds && `Medicines: ${medicineHolds}`].filter(Boolean).join('\n');
  if (text) {
    p.messages.push({ date: today, from: req.user._id, text });
    const pu = await patientUserOf(p.patient);
    if (pu) await notify({ to: { user: pu }, kind: 'info', procedure: p, title: 'New instructions from your anaesthetist', body: 'Open MedSync to read them.' });
  }
  await p.save();
  await audit(req.user, 'Recorded anaesthesia assessment', p.procedureName);
  ok(res, await loadCase(p._id));
}));

r.post('/:id/messages', asyncHandler(async (req, res) => {
  const p = await getProcedureFor(req.user, req.params.id);
  const text = (req.body?.text || '').trim();
  assert(text, 400, 'Message cannot be empty');
  assert(req.user.role !== 'admin', 403, 'Administrators cannot send clinical messages');
  p.messages.push({ date: todayISO(), from: req.user._id, text: text.slice(0, 2000) });
  if (req.user.role === 'patient') {
    p.lastPatientActivity = todayISO();
    await notify({ to: { user: p.surgeon }, kind: 'info', procedure: p, title: `Message from ${req.user.name}`, body: text.slice(0, 80) });
  } else {
    const pu = await patientUserOf(p.patient);
    if (pu) await notify({ to: { user: pu }, kind: 'info', procedure: p, title: `Message from ${req.user.name}`, body: text.slice(0, 80) });
  }
  await p.save();
  ok(res, await loadCase(p._id), 201);
}));

r.post('/:id/confirm-attendance', allow('patient'), asyncHandler(async (req, res) => {
  const p = await getProcedureFor(req.user, req.params.id);
  const today = todayISO();
  const days = diffDays(p.surgeryDate, today);
  assert(['LISTED', 'PREPARATION', 'READY', 'SCHEDULED'].includes(p.stage) && days >= 0 && days <= 3, 400, 'Attendance can be confirmed in the 3 days before surgery');
  p.confirmations = { patient: today };
  p.lastPatientActivity = today;
  logActivity(p, req.user, 'Confirmed attendance for surgery');
  await notify({ to: { role: 'coordinator' }, kind: 'info', procedure: p, title: `${req.user.name} confirmed attendance`, body: `Surgery on ${formatDate(p.surgeryDate)}` });
  await p.save();
  ok(res, await loadCase(p._id));
}));

r.put('/:id/alerts/:alertId', allow('surgeon'), asyncHandler(async (req, res) => {
  const p = await getProcedureFor(req.user, req.params.id);
  const a = p.alerts.id(req.params.alertId);
  if (!a) throw new ApiError(404, 'Alert not found');
  const { status, response } = req.body || {};
  assert(['advised', 'recalled', 'resolved'].includes(status), 400, 'Choose a response');
  assert(status === 'resolved' || (response && response.trim()), 400, 'Write a message to the patient');
  const today = todayISO();
  Object.assign(a, { status, response: (response || '').trim(), respondedBy: req.user._id, respondedOn: today });
  const verb = { advised: 'Sent advice', recalled: 'Recalled patient for review', resolved: 'Resolved alert' }[status];
  logActivity(p, req.user, `${verb}${response ? `: ${response.trim()}` : ''}`);
  if (response && response.trim()) p.messages.push({ date: today, from: req.user._id, text: response.trim() });
  const pu = await patientUserOf(p.patient);
  if (pu && status !== 'resolved') await notify({ to: { user: pu }, kind: status === 'recalled' ? 'escalation' : 'info', procedure: p, title: status === 'recalled' ? 'Please come to the surgical clinic for a review' : 'Your doctor sent you advice', body: response });
  await p.save();
  await audit(req.user, verb, p.procedureName);
  ok(res, await loadCase(p._id));
}));
export default r;
