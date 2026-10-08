import { Router } from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ok, ApiError } from '../utils/http.js';

const r = Router();
r.use(requireAuth);
const mine = (u) => ({ $or: [{ toUser: u._id }, { toRole: u.role }] });
const dto = (n, u) => ({ id: n._id.toString(), date: n.date, title: n.title, body: n.body, kind: n.kind, caseId: n.procedure ? n.procedure.toString() : null, read: n.readBy.some((x) => x.equals(u._id)), to: n.toUser ? { userId: n.toUser.toString() } : { role: n.toRole }, createdAt: n.createdAt });

r.get('/', asyncHandler(async (req, res) => {
  const list = await Notification.find(mine(req.user)).sort({ createdAt: -1 }).limit(200);
  ok(res, list.map((n) => dto(n, req.user)));
}));
r.put('/read-all', asyncHandler(async (req, res) => {
  const r2 = await Notification.updateMany({ ...mine(req.user), readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  ok(res, { updated: r2.modifiedCount });
}));
r.put('/:id/read', asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, ...mine(req.user) });
  if (!n) throw new ApiError(404, 'Notification not found');
  n.readBy.addToSet(req.user._id);
  await n.save();
  ok(res, dto(n, req.user));
}));
export default r;
