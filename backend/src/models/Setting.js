import mongoose from 'mongoose';

// Single document holding the hospital's configurable rules (reminders, escalation, risk, recovery plans).
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'rules' },
  rules: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true, minimize: false });
export default mongoose.model('Setting', settingSchema);
