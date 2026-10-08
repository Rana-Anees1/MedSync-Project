import mongoose from 'mongoose';

const riskAssessmentSchema = new mongoose.Schema({
  procedure: { type: mongoose.Schema.Types.ObjectId, ref: 'Procedure', required: true, index: true },
  kind: { type: String, enum: ['cancellation', 'complication'], required: true },
  probability: { type: Number, min: 0, max: 1, required: true },
  level: { type: String, enum: ['low', 'medium', 'high'], required: true },
  factors: [{ label: String, impact: Number, direction: String, _id: false }],
  model: { name: String, version: String, type: { type: String, enum: ['rule-based', 'ml'], required: true } },
  date: String,
}, { timestamps: true });
export default mongoose.model('RiskAssessment', riskAssessmentSchema);
