import { Router } from 'express';
import ReadinessItem from '../models/ReadinessItem.js';
import { requireAuth, allow } from '../middleware/auth.js';
import { upload, fileMeta } from '../middleware/upload.js';
import { asyncHandler, ok, ApiError, assert } from '../utils/http.js';
import { notify, audit, logActivity, patientUserOf } from '../services/notify.js';
import { getProcedureFor } from '../services/access.js';
import { itemDto } from '../services/caseDto.js';
import { todayISO } from '../domain/date.js';
import { PREOP_STATES } from '../domain/constants.js';

const r = Router();
r.use(requireAuth);
const OWNERS = ['patient', 'coordinator', 'anaesthetist', 'surgeon'];
/** Which staff role may act on an item: the owner role; the coordinator also handles patient-owned items. */
const mayAct = (role, item) => role === item.owner || (role === 'coordinator' && item.owner === 'patient');
const startPrep = (p) => { if (p.stage === 'LISTED') p.stage = 'PREPARATION'; };

r.get('/:procedureId', asyncHandler(async (req, res) => {
  const p = await getProcedureFor(req.user, req.params.procedureId);
  const items = await ReadinessItem.find({ procedure: p._id }).sort({ deadline: 1, createdAt: 1 });
  ok(res, items.map(itemDto));
}));

/** Add a custom readiness task to a procedure's plan. */
r.post('/', allow('surgeon', 'anaesthetist', 'coordinator'), asyncHandler(async (req, res) => {
  const { procedureId, title, description, owner, deadline, priority, mandatory } = req.body || {};
  const p = await getProcedureFor(req.user, procedureId);
  assert(PREOP_STATES.includes(p.stage), 400, 'Tasks can only be added before surgery');
  assert(title && title.trim(), 400, 'Enter the task');
  assert(OWNERS.includes(owner), 400, 'Choose who is responsible');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(deadline || '') && deadline >= todayISO() && deadline <= p.surgeryDate, 400, 'Deadline must be between today and the surgery date');
  const item = await ReadinessItem.create({
    procedure: p._id, key: `custom_${Date.now()}`, title: title.trim(), description: (description || '').trim(), owner, deadline,
    priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium', mandatory: mandatory !== false, patientTask: owner === 'patient',
    category: owner === 'patient' ? 'investigation' : 'referral', reason: `Added by ${req.user.name}`,
  });
  logActivity(p, req.user, `Added task "${item.title}"`);
  await p.save();
  if (owner === 'patient') { const pu = await patientUserOf(p.patient); if (pu) await notify({ to: { user: pu }, kind: 'info', procedure: p, title: `New preparation task: ${item.title}`, body: `Due ${deadline}` }); }
  await audit(req.user, 'Added readiness task', item.title);
  ok(res, itemDto(item), 201);
}));

/** Staff updates: start | complete | return | not_required | reopen | edit */
r.put('/:id', allow('surgeon', 'anaesthetist', 'coordinator'), asyncHandler(async (req, res) => {
  const item = await ReadinessItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Task not found');
  const p = await getProcedureFor(req.user, item.procedure);
  assert(PREOP_STATES.includes(p.stage) || p.stage === 'DEFERRED', 400, 'The readiness plan is closed for this case');
  const { action, note, reason, deadline, priority, description } = req.body || {};
  const today = todayISO();
  if (action !== 'edit') assert(mayAct(req.user.role, item), 403, 'This task is owned by another role');
  switch (action) {
    case 'start': item.status = 'in_progress'; break;
    case 'complete':
      Object.assign(item, { status: 'completed', completedOn: today, completedBy: req.user._id, note: note || item.note });
      break;
    case 'return':
      assert(reason && reason.trim(), 400, 'Explain what needs to be fixed');
      Object.assign(item, { status: 'pending', completedOn: null, note: `Returned: ${reason.trim()}` });
      { const pu = await patientUserOf(p.patient); if (pu) await notify({ to: { user: pu }, kind: 'escalation', procedure: p, title: `Please redo: ${item.title}`, body: reason.trim() }); }
      break;
    case 'not_required':
      assert(!item.dayOf, 400, 'Day-of-surgery instructions cannot be removed');
      assert(reason && reason.trim(), 400, 'Enter the reason');
      Object.assign(item, { status: 'not_required', completedOn: today, completedBy: req.user._id, note: reason.trim() });
      break;
    case 'reopen': Object.assign(item, { status: 'pending', completedOn: null, completedBy: null }); break;
    case 'edit':
      assert(['surgeon', 'coordinator'].includes(req.user.role), 403, 'Only the surgeon or coordinator can edit tasks');
      if (deadline) { assert(deadline <= p.surgeryDate, 400, 'Deadline cannot be after the surgery date'); item.deadline = deadline; if (item.status === 'overdue' && deadline >= today) { item.status = 'pending'; item.escalationLevel = 0; } }
      if (['high', 'medium', 'low'].includes(priority)) item.priority = priority;
      if (typeof description === 'string') item.description = description.trim();
      break;
    default: throw new ApiError(400, 'Unknown action');
  }
  await item.save();
  startPrep(p);
  logActivity(p, req.user, `${{ start: 'Started', complete: 'Completed', return: 'Returned', not_required: 'Marked not required', reopen: 'Reopened', edit: 'Edited' }[action]} "${item.title}"`);
  await p.save();
  await audit(req.user, `Readiness task: ${action}`, item.title);
  ok(res, itemDto(item));
}));

/** Patient completes own task. Investigations / donor tasks can include an uploaded file and wait for staff verification. */
r.post('/:id/submission', allow('patient'), upload.single('file'), asyncHandler(async (req, res) => {
  const item = await ReadinessItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Task not found');
  const p = await getProcedureFor(req.user, item.procedure);
  assert(item.patientTask, 403, 'This task is handled by your hospital team');
  assert(PREOP_STATES.includes(p.stage), 400, 'Your preparation plan is closed');
  assert(['pending', 'overdue'].includes(item.status), 400, 'This task is already submitted or completed');
  const needsCheck = ['investigation', 'blood'].includes(item.category);
  if (needsCheck && item.category === 'investigation') assert(req.file, 400, 'Attach the report (photo or PDF)');
  const today = todayISO();
  Object.assign(item, needsCheck
    ? { status: 'in_progress', completedOn: today, note: req.file ? `Uploaded: ${req.file.originalname}` : 'Patient confirmed', attachment: fileMeta(req.file) }
    : { status: 'completed', completedOn: today, completedBy: req.user._id });
  await item.save();
  p.lastPatientActivity = today;
  startPrep(p);
  logActivity(p, req.user, needsCheck ? `Submitted "${item.title}" for checking` : `Confirmed "${item.title}"`);
  await p.save();
  if (needsCheck) await notify({ to: { role: 'coordinator' }, kind: 'info', procedure: p, title: `${req.user.name} submitted: ${item.title}`, body: req.file ? `File: ${req.file.originalname}` : 'Waiting for your check' });
  ok(res, itemDto(item));
}));
export default r;
