import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;
const recoveryCheckInSchema = new mongoose.Schema({
  procedure: { type: ObjectId, ref: 'Procedure', required: true, index: true },
  patient: { type: ObjectId, ref: 'Patient', required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  generalStatus: { type: String, enum: ['better', 'same', 'worse'], required: true },
  symptoms: { type: [String], default: [] },
  temp: { type: Number, min: 34, max: 43, required: true },
  pain: { type: Number, min: 0, max: 10, required: true },
  wound: { type: String, enum: ['normal', 'red', 'swollen', 'discharge', 'opened'], required: true },
  eating: { type: String, enum: ['normal', 'reduced', 'none'], required: true },
  mobility: { type: String, enum: ['normal', 'limited', 'bedbound'], required: true },
  drain: { type: Number, min: 0, max: 5000 },
  bleeding: { type: Boolean, default: false },
  breathless: { type: Boolean, default: false },
  notes: { type: String, default: '', maxlength: 2000 },
  photo: { fileName: String, storedName: String, mimeType: String, size: Number },
  score: { type: Number, required: true },
  redFlag: { type: Boolean, default: false },
  reasons: { type: [String], default: [] },
}, { timestamps: true });
export default mongoose.model('RecoveryCheckIn', recoveryCheckInSchema);
