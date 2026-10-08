import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { requireAuth, allow } from '../middleware/auth.js';
import { asyncHandler, ok, ApiError, assert } from '../utils/http.js';
import { audit } from '../services/notify.js';
import { validatePassword } from './auth.js';
import { ROLES } from '../domain/constants.js';

const r = Router();
r.use(requireAuth);
r.get('/me', (req, res) => ok(res, { user: req.user.toPublic() }));

/** Names and roles of staff (needed to show who did what). Patients only see staff + themselves. */
r.get('/directory', asyncHandler(async (req, res) => {
  const users = await User.find({ $or: [{ role: { $ne: 'patient' } }, { _id: req.user._id }], approval: 'approved' }).sort({ role: 1, name: 1 });
  ok(res, users.map((u) => ({ id: u._id.toString(), name: u.name, role: u.role, title: u.title, active: u.active, patientId: u.patient ? u.patient.toString() : null })));
}));

r.get('/', allow('admin'), asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ approval: -1, role: 1, name: 1 });
  ok(res, users.map((u) => u.toPublic()));
}));

r.post('/', allow('admin'), asyncHandler(async (req, res) => {
  const { name, email, password, role, title, patientId } = req.body || {};
  assert(name && /^\S+@\S+\.\S+$/.test(email || ''), 400, 'Enter a name and a valid e-mail address');
  assert(ROLES.includes(role), 400, 'Invalid role');
  validatePassword(password);
  if (role === 'patient') {
    assert(patientId && (await Patient.exists({ _id: patientId })), 400, 'Select the patient record for this account');
    if (await User.exists({ patient: patientId })) throw new ApiError(409, 'This patient already has an account');
  }
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role, title: title || '', patient: role === 'patient' ? patientId : undefined });
  await audit(req.user, 'Added user', `${user.name} (${role})`);
  ok(res, user.toPublic(), 201);
}));

r.patch('/:id', allow('admin'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  const { active, approval, title } = req.body || {};
  if (user._id.equals(req.user._id) && (active === false || approval === 'pending')) throw new ApiError(400, 'You cannot deactivate your own account');
  if (typeof active === 'boolean') user.active = active;
  if (['approved', 'pending'].includes(approval)) user.approval = approval;
  if (typeof title === 'string') user.title = title;
  await user.save();
  await audit(req.user, approval === 'approved' ? 'Approved user' : active === false ? 'Deactivated user' : 'Updated user', user.name);
  ok(res, user.toPublic());
}));
export default r;
