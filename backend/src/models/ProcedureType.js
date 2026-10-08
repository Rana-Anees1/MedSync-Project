import mongoose from 'mongoose';

const templateItemSchema = new mongoose.Schema({
  key: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  titleUr: { type: String, default: '' },
  description: { type: String, default: '' },
  owner: { type: String, enum: ['patient', 'coordinator', 'anaesthetist', 'surgeon'], required: true },
  category: { type: String, default: 'investigation' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  offsetDays: { type: Number, min: 0, max: 60, required: true },
  mandatory: { type: Boolean, default: true },
  patientTask: { type: Boolean, default: false },
  dayOf: { type: Boolean, default: false },
}, { _id: false });

// A procedure type is the clinician-configured template of what "ready" means for an operation.
const procedureTypeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  durationMin: { type: Number, min: 5, max: 900, default: 60 },
  complicationBase: { type: Number, min: 0, max: 1, default: 0.25 },
  items: { type: [templateItemSchema], default: [] },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('ProcedureType', procedureTypeSchema);
