import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;
const notificationSchema = new mongoose.Schema({
  toUser: { type: ObjectId, ref: 'User', index: true },
  toRole: { type: String, index: true },
  kind: { type: String, enum: ['reminder', 'escalation', 'risk', 'alert', 'info'], default: 'info' },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  procedure: { type: ObjectId, ref: 'Procedure' },
  date: String,
  readBy: { type: [ObjectId], default: [] },
}, { timestamps: true });
export default mongoose.model('Notification', notificationSchema);
