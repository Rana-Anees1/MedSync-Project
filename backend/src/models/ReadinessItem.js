import mongoose from 'mongoose';
import { ITEM_STATUSES } from '../domain/constants.js';

const { ObjectId } = mongoose.Schema.Types;
// Each document is one task of a procedure's readiness plan (the plan = all items of a procedure).
const readinessItemSchema = new mongoose.Schema({
  procedure: { type: ObjectId, ref: 'Procedure', required: true, index: true },
  key: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  titleUr: { type: String, default: '' },
  description: { type: String, default: '', maxlength: 1000 },
  owner: { type: String, enum: ['patient', 'coordinator', 'anaesthetist', 'surgeon'], required: true },
  category: { type: String, default: 'investigation' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  mandatory: { type: Boolean, default: true },
  patientTask: { type: Boolean, default: false },
  dayOf: { type: Boolean, default: false },
  reason: String,
  offsetDays: { type: Number, default: 0 },
  deadline: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: { type: String, enum: ITEM_STATUSES, default: 'pending' },
  escalationLevel: { type: Number, min: 0, max: 2, default: 0 },
  lastReminderOn: String,
  completedOn: String,
  completedBy: { type: ObjectId, ref: 'User' },
  note: { type: String, default: '' },
  attachment: { fileName: String, storedName: String, mimeType: String, size: Number },
}, { timestamps: true });
export default mongoose.model('ReadinessItem', readinessItemSchema);
