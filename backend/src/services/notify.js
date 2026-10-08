import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { todayISO } from '../domain/date.js';

/** to: { user } (ObjectId/User) or { role } */
export async function notify({ to, title, body = '', procedure = null, kind = 'info' }) {
  const doc = { title, body, kind, procedure: procedure?._id || procedure || undefined, date: todayISO() };
  if (to.user) doc.toUser = to.user._id || to.user;
  else doc.toRole = to.role;
  if (!doc.toUser && !doc.toRole) return null;
  return Notification.create(doc);
}
export const audit = (actor, action, target = '') => AuditLog.create({ actor: actor?._id, actorName: actor?.name || 'MedSync', action, target, date: todayISO() });
export const logActivity = (proc, actor, text) => proc.activity.unshift({ date: todayISO(), actor: actor?.name || actor || 'MedSync', text });
export const patientUserOf = async (patientId) => (await User.findOne({ patient: patientId, role: 'patient' }).select('_id'))?._id;
