import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import ReadinessItem from '../models/ReadinessItem.js';
import RecoveryCheckIn from '../models/RecoveryCheckIn.js';
import Procedure from '../models/Procedure.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadRoot } from '../middleware/upload.js';
import { asyncHandler, ApiError } from '../utils/http.js';

const r = Router();
/** Serves an uploaded file only to clinical staff or the patient who owns it. */
r.get('/:name', requireAuth, asyncHandler(async (req, res) => {
  const name = path.basename(req.params.name);
  const owner = (await ReadinessItem.findOne({ 'attachment.storedName': name }).lean()) || (await RecoveryCheckIn.findOne({ 'photo.storedName': name }).lean());
  if (!owner) throw new ApiError(404, 'File not found');
  const proc = await Procedure.findById(owner.procedure).lean();
  const staff = ['surgeon', 'anaesthetist', 'coordinator'].includes(req.user.role);
  const own = req.user.role === 'patient' && proc && proc.patient.toString() === req.user.patient?.toString();
  if (!staff && !own) throw new ApiError(403, 'Not allowed');
  const file = path.join(uploadRoot, name);
  if (!fs.existsSync(file)) throw new ApiError(404, 'File not found');
  res.sendFile(file);
}));
export default r;
