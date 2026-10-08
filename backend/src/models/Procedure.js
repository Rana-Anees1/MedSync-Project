import mongoose from 'mongoose';
import { STAGES } from '../domain/constants.js';

const { ObjectId } = mongoose.Schema.Types;
const dateOnly = { type: String, match: [/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'] };

const messageSchema = new mongoose.Schema({ date: dateOnly, from: { type: ObjectId, ref: 'User' }, text: { type: String, required: true, maxlength: 2000 } }, { timestamps: true });
const activitySchema = new mongoose.Schema({ date: dateOnly, actor: String, text: String }, { timestamps: true });
const alertSchema = new mongoose.Schema({
  date: dateOnly,
  type: { type: String, enum: ['threshold', 'trend', 'redflag'] },
  severity: { type: String, enum: ['medium', 'high', 'critical'] },
  message: String,
  checkIn: { type: ObjectId, ref: 'RecoveryCheckIn' },
  status: { type: String, enum: ['open', 'advised', 'recalled', 'resolved'], default: 'open' },
  response: String,
  respondedBy: { type: ObjectId, ref: 'User' },
  respondedOn: dateOnly,
}, { timestamps: true });

// One elective operation for one patient, from listing to recovery.
const procedureSchema = new mongoose.Schema({
  patient: { type: ObjectId, ref: 'Patient', required: true, index: true },
  procedureType: { type: ObjectId, ref: 'ProcedureType', required: true },
  procedureName: { type: String, required: true },
  surgeon: { type: ObjectId, ref: 'User', required: true },
  anaesthetist: { type: ObjectId, ref: 'User' },
  coordinator: { type: ObjectId, ref: 'User' },
  listedOn: { ...dateOnly, required: true },
  surgeryDate: { ...dateOnly, required: true },
  stage: { type: String, enum: STAGES, default: 'LISTED', index: true },
  assessment: {
    date: dateOnly, by: { type: ObjectId, ref: 'User' }, asa: String, airway: String, fasting: String,
    medicineHolds: String, notes: String, clearedBy: { type: ObjectId, ref: 'User' }, clearedOn: dateOnly,
  },
  labs: { abnormal: { type: [String], default: [] } },
  lastPatientActivity: dateOnly,
  confirmations: { patient: dateOnly },
  preopOverdueCount: { type: Number, default: 0 },
  flags: { type: mongoose.Schema.Types.Mixed, default: {} },
  deferral: { date: dateOnly, by: { type: ObjectId, ref: 'User' }, reason: String, newDate: dateOnly },
  cancellation: { date: dateOnly, by: { type: ObjectId, ref: 'User' }, category: String, reason: String },
  operation: { date: dateOnly, durationMin: Number, notes: String },
  discharge: { date: dateOnly, plan: { tier: String, threshold: Number, everyDays: Number, days: Number }, riskAssessment: { type: ObjectId, ref: 'RiskAssessment' } },
  closedOn: dateOnly,
  alerts: { type: [alertSchema], default: [] },
  messages: { type: [messageSchema], default: [] },
  activity: { type: [activitySchema], default: [] },
}, { timestamps: true, minimize: false });
export default mongoose.model('Procedure', procedureSchema);
