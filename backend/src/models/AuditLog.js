import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String, default: '' },
  date: String,
}, { timestamps: true });
export default mongoose.model('AuditLog', auditLogSchema);
