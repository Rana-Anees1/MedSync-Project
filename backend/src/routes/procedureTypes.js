import { Router } from 'express';
import ProcedureType from '../models/ProcedureType.js';
import { requireAuth, allow } from '../middleware/auth.js';
import { asyncHandler, ok, ApiError } from '../utils/http.js';
import { audit } from '../services/notify.js';

const r = Router();
r.use(requireAuth, allow('admin', 'surgeon', 'anaesthetist', 'coordinator'));
export const typeDto = (t) => ({ id: t._id.toString(), code: t.code, name: t.name, durationMin: t.durationMin, complicationBase: t.complicationBase, items: t.items, active: t.active });

r.get('/', asyncHandler(async (_req, res) => ok(res, (await ProcedureType.find().sort({ name: 1 })).map(typeDto))));
r.post('/', allow('admin'), asyncHandler(async (req, res) => {
  const t = await ProcedureType.create({ ...req.body, code: req.body.code || `tpl_${Date.now()}` });
  await audit(req.user, 'Created procedure type', t.name);
  ok(res, typeDto(t), 201);
}));
r.put('/:id', allow('admin'), asyncHandler(async (req, res) => {
  const t = await ProcedureType.findById(req.params.id);
  if (!t) throw new ApiError(404, 'Procedure type not found');
  const { name, durationMin, items, active } = req.body || {};
  if (name !== undefined) t.name = name;
  if (durationMin !== undefined) t.durationMin = durationMin;
  if (Array.isArray(items)) t.items = items.map((it) => ({ ...it, patientTask: it.owner === 'patient' }));
  if (typeof active === 'boolean') t.active = active;
  await t.save();
  await audit(req.user, 'Updated procedure template', t.name);
  ok(res, typeDto(t));
}));
export default r;
