import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { asyncHandler, ok, ApiError, assert } from '../utils/http.js';
import { notify, audit } from '../services/notify.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { message: 'Too many attempts. Try again later.' } } });
const STAFF_SIGNUP_ROLES = ['surgeon', 'anaesthetist', 'coordinator'];
export const validatePassword = (pw) => {
  assert(typeof pw === 'string' && pw.length >= 8, 400, 'Password must be at least 8 characters');
  assert(/[A-Za-z]/.test(pw) && /\d/.test(pw), 400, 'Password must contain letters and numbers');
};
const digits = (s = '') => s.replace(/\D/g, '');

/**
 * Self-registration.
 * - Patients link their account to a patient record that the hospital has registered (MRN + mobile must match).
 * - Staff accounts are created as "pending" and must be approved by an administrator before they can sign in.
 */
r.post('/register', limiter, asyncHandler(async (req, res) => {
  const { name, email, password, accountType, staffRole, title, mrn, phone } = req.body || {};
  assert(name && name.trim().length >= 3, 400, 'Enter your full name');
  assert(/^\S+@\S+\.\S+$/.test(email || ''), 400, 'Enter a valid e-mail address');
  validatePassword(password);
  assert(['patient', 'staff'].includes(accountType), 400, 'Choose patient or hospital staff');
  if (await User.exists({ email: email.toLowerCase().trim() })) throw new ApiError(409, 'An account with this e-mail already exists');
  const passwordHash = await bcrypt.hash(password, 12);

  if (accountType === 'patient') {
    assert(mrn && phone, 400, 'Enter your hospital MRN and the mobile number registered with the hospital');
    const patient = await Patient.findOne({ mrn: mrn.trim().toUpperCase() });
    if (!patient || digits(patient.phone) !== digits(phone)) throw new ApiError(400, 'MRN and mobile number do not match a registered patient. Please contact the surgical ward.');
    if (await User.exists({ patient: patient._id })) throw new ApiError(409, 'This patient record already has an account');
    const user = await User.create({ name: name.trim(), email, passwordHash, role: 'patient', title: 'Patient', patient: patient._id });
    await audit(user, 'Patient account registered', patient.mrn);
    return ok(res, { token: signToken(user), user: user.toPublic() }, 201);
  }
  assert(STAFF_SIGNUP_ROLES.includes(staffRole), 400, 'Choose your staff role');
  const user = await User.create({ name: name.trim(), email, passwordHash, role: staffRole, title: (title || '').trim(), approval: 'pending' });
  await notify({ to: { role: 'admin' }, kind: 'info', title: `Staff account awaiting approval: ${user.name}`, body: `${staffRole} · ${user.email}` });
  await audit(user, 'Staff account requested', `${user.name} (${staffRole})`);
  return ok(res, { pending: true, message: 'Your account has been created and is waiting for administrator approval.' }, 201);
}));

r.post('/login', limiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  assert(email && password, 400, 'Enter your e-mail and password');
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(401, 'Incorrect e-mail or password');
  if (user.approval !== 'approved') throw new ApiError(403, 'Your account is waiting for administrator approval');
  if (!user.active) throw new ApiError(403, 'Your account has been deactivated. Contact the administrator.');
  user.lastLoginAt = new Date();
  await user.save();
  return ok(res, { token: signToken(user), user: user.toPublic() });
}));

r.get('/me', requireAuth, (req, res) => ok(res, { user: req.user.toPublic() }));
export default r;
