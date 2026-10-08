import Procedure from '../models/Procedure.js';
import { ApiError } from '../utils/http.js';

export const STAFF_VIEW = ['admin', 'surgeon', 'anaesthetist', 'coordinator'];
export async function getProcedureFor(user, id) {
  const p = await Procedure.findById(id);
  if (!p) throw new ApiError(404, 'Procedure not found');
  if (user.role === 'patient' && p.patient.toString() !== user.patient?.toString()) throw new ApiError(403, 'You can only access your own records');
  if (user.role !== 'patient' && !STAFF_VIEW.includes(user.role)) throw new ApiError(403, 'Not allowed');
  return p;
}
export const caseFilterFor = (user) => (user.role === 'patient' ? { patient: user.patient } : {});
