import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  mrn: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  age: { type: Number, required: true, min: 0, max: 120 },
  gender: { type: String, enum: ['Female', 'Male', 'Other'], required: true },
  phone: { type: String, required: true, trim: true, match: [/^03\d{2}-?\d{7}$/, 'Use a mobile number like 0300-1234567'] },
  city: { type: String, trim: true, default: '' },
  language: { type: String, enum: ['ur', 'en'], default: 'ur' },
  comorbidities: { type: [String], default: [] },
  bmi: { type: Number, min: 10, max: 80 },
  smoker: { type: Boolean, default: false },
  previousNoShow: { type: Boolean, default: false },
  attendant: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
patientSchema.index({ name: 1 });
export default mongoose.model('Patient', patientSchema);
