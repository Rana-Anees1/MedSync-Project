import { Router } from 'express';
import Patient from '../models/Patient.js';
import Procedure from '../models/Procedure.js';
import { requireAuth, allow } from '../middleware/auth.js';
import { asyncHandler, ok, ApiError } from '../utils/http.js';
import { audit } from '../services/notify.js';

const r = Router();
r.use(requireAuth);
const CLINICAL = ['surgeon', 'anaesthetist', 'coordinator'];
const FIELDS = ['name', 'age', 'gender', 'phone', 'city', 'language', 'comorbidities', 'bmi', 'smoker', 'previousNoShow', 'attendant'];
const pick = (b) => Object.fromEntries(FIELDS.filter((k) => b[k] !== undefined).map((k) => [k, b[k]]));
export const patientDto = (p) => ({ id: p._id.toString(), mrn: p.mrn, name: p.name, age: p.age, gender: p.gender, phone: p.phone, city: p.city, language: p.language, comorbidities: p.comorbidities, bmi: p.bmi, smoker: p.smoker, previousNoShow: p.previousNoShow, attendant: p.attendant, createdAt: p.createdAt, updatedAt: p.updatedAt });
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

r.get('/me', allow('patient'), asyncHandler(async (req, res) => {
  const p = await Patient.findById(req.user.patient);
  if (!p) throw new ApiError(404, 'No patient record linked to this account');
  ok(res, patientDto(p));
}));

r.get('/', allow(...CLINICAL), asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const filter = q ? { $or: [{ name: new RegExp(escapeRx(q), 'i') }, { mrn: new RegExp(escapeRx(q), 'i') }, { phone: new RegExp(escapeRx(q)) }] } : {};
  const patients = await Patient.find(filter).sort({ name: 1 }).limit(500).lean();
  const counts = await Procedure.aggregate([{ $group: { _id: '$patient', n: { $sum: 1 } } }]);
  const cnt = Object.fromEntries(counts.map((c) => [c._id.toString(), c.n]));
  ok(res, patients.map((p) => ({ ...patientDto(p), procedureCount: cnt[p._id.toString()] || 0 })));
}));

r.post('/', allow('surgeon', 'coordinator'), asyncHandler(async (req, res) => {
  const body = pick(req.body || {});
  let mrn = (req.body?.mrn || '').trim().toUpperCase();
  if (!mrn) {
    const last = await Patient.find({ mrn: /^MS-\d+$/ }).sort({ mrn: -1 }).limit(1).lean();
    mrn = `MS-${String((last[0] ? Number(last[0].mrn.slice(3)) : 1000) + 1).padStart(4, '0')}`;
  }
  const p = await Patient.create({ ...body, mrn, createdBy: req.user._id });
  await audit(req.user, 'Registered patient', `${p.name} (${p.mrn})`);
  ok(res, patientDto(p), 201);
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const allowed = CLINICAL.includes(req.user.role) || (req.user.role === 'patient' && req.user.patient?.toString() === req.params.id);
  if (!allowed) throw new ApiError(403, 'You do not have permission to view this patient');
  const p = await Patient.findById(req.params.id);
  if (!p) throw new ApiError(404, 'Patient not found');
  const history = await Procedure.find({ patient: p._id }).sort({ surgeryDate: -1 }).populate('surgeon', 'name').lean();
  ok(res, { ...patientDto(p), history: history.map((h) => ({ id: h._id.toString(), procedureName: h.procedureName, surgeryDate: h.surgeryDate, stage: h.stage, surgeon: h.surgeon?.name || '', listedOn: h.listedOn, outcome: h.cancellation?.category || (h.closedOn ? `Recovered ${h.closedOn}` : null) })) });
}));

r.put('/:id', allow('surgeon', 'coordinator'), asyncHandler(async (req, res) => {
  const p = await Patient.findById(req.params.id);
  if (!p) throw new ApiError(404, 'Patient not found');
  Object.assign(p, pick(req.body || {}));
  await p.save();
  await audit(req.user, 'Updated patient', `${p.name} (${p.mrn})`);
  ok(res, patientDto(p));
}));
export default r;
