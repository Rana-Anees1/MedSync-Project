import mongoose from 'mongoose';
import { ROLES } from '../domain/constants.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Invalid e-mail address'] },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, required: true },
  title: { type: String, trim: true, default: '' },
  active: { type: Boolean, default: true },
  approval: { type: String, enum: ['approved', 'pending'], default: 'approved' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  lastLoginAt: Date,
}, { timestamps: true });

userSchema.methods.toPublic = function toPublic() {
  return { id: this._id.toString(), name: this.name, email: this.email, role: this.role, title: this.title, active: this.active, approval: this.approval, patientId: this.patient ? this.patient.toString() : null, createdAt: this.createdAt };
};
export default mongoose.model('User', userSchema);
