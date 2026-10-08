import Procedure from '../models/Procedure.js';
import ReadinessItem from '../models/ReadinessItem.js';
import RecoveryCheckIn from '../models/RecoveryCheckIn.js';
import RiskAssessment from '../models/RiskAssessment.js';
import Patient from '../models/Patient.js';
import { ruleBased } from './ai/riskProvider.js';
import { getRules } from './rules.js';
import { todayISO } from '../domain/date.js';

const sid = (v) => (v ? v.toString() : null);

export const itemDto = (i) => ({
  id: sid(i._id), procedureId: sid(i.procedure), key: i.key, title: i.title, titleUr: i.titleUr, description: i.description, owner: i.owner,
  category: i.category, priority: i.priority, mandatory: i.mandatory, patientTask: i.patientTask, dayOf: i.dayOf, reason: i.reason || null,
  offsetDays: i.offsetDays, deadline: i.deadline, status: i.status, escalationLevel: i.escalationLevel, completedOn: i.completedOn || null,
  completedBy: sid(i.completedBy), note: i.note || '', attachment: i.attachment?.storedName ? { fileName: i.attachment.fileName, url: `/files/${i.attachment.storedName}` } : null,
});
export const checkinDto = (c) => ({
  id: sid(c._id), procedureId: sid(c.procedure), date: c.date, generalStatus: c.generalStatus, symptoms: c.symptoms, temp: c.temp, pain: c.pain,
  wound: c.wound, eating: c.eating, mobility: c.mobility, drain: c.drain ?? '', bleeding: c.bleeding, breathless: c.breathless, notes: c.notes,
  photo: Boolean(c.photo?.storedName), photoUrl: c.photo?.storedName ? `/files/${c.photo.storedName}` : null, score: c.score, redFlag: c.redFlag, reasons: c.reasons,
});
export const riskDto = (r) => (r ? { probability: r.probability, level: r.level, tier: r.level, factors: r.factors, model: r.model, date: r.date } : null);
export const patientRiskInput = (p) => (p ? { age: p.age, comorbidities: p.comorbidities || [], bmi: p.bmi, smoker: p.smoker, previousNoShow: p.previousNoShow } : null);

export function toDto(p, items = [], checkins = [], dischargeRisk = null) {
  return {
    id: sid(p._id), patientId: sid(p.patient), surgeonId: sid(p.surgeon), anaesthetistId: sid(p.anaesthetist), coordinatorId: sid(p.coordinator),
    templateId: sid(p.procedureType), procedureName: p.procedureName, listedOn: p.listedOn, surgeryDate: p.surgeryDate, status: p.stage,
    items: items.map(itemDto),
    assessment: p.assessment?.date ? { ...p.assessment, by: sid(p.assessment.by), clearedBy: sid(p.assessment.clearedBy) } : null,
    labs: { abnormal: p.labs?.abnormal || [] }, lastPatientActivity: p.lastPatientActivity || p.listedOn,
    confirmations: p.confirmations || {}, preopOverdueCount: p.preopOverdueCount || 0, flags: p.flags || {},
    deferral: p.deferral?.date ? { ...p.deferral, by: sid(p.deferral.by) } : null,
    cancellation: p.cancellation?.date ? { ...p.cancellation, by: sid(p.cancellation.by) } : null,
    operation: p.operation?.date ? p.operation : null,
    discharge: p.discharge?.date ? { date: p.discharge.date, plan: p.discharge.plan, risk: riskDto(dischargeRisk) } : null,
    closedOn: p.closedOn || null,
    checkins: checkins.map(checkinDto),
    alerts: (p.alerts || []).map((a) => ({ id: sid(a._id), date: a.date, type: a.type, severity: a.severity, message: a.message, status: a.status, response: a.response || null, respondedBy: sid(a.respondedBy), respondedOn: a.respondedOn || null })),
    messages: (p.messages || []).map((m) => ({ id: sid(m._id), date: m.date, from: sid(m.from), text: m.text })),
    activity: (p.activity || []).map((a) => ({ id: sid(a._id), date: a.date, actor: a.actor, text: a.text })),
    createdAt: p.createdAt, updatedAt: p.updatedAt,
  };
}

/** Loads procedures with their readiness items, check-ins and risk estimates in a few batched queries. */
export async function loadCases(filter = {}, { sort = { surgeryDate: 1 } } = {}) {
  const procs = await Procedure.find(filter).sort(sort).lean();
  if (!procs.length) return [];
  const ids = procs.map((p) => p._id);
  const [items, checkins, risks, patients, rules] = await Promise.all([
    ReadinessItem.find({ procedure: { $in: ids } }).sort({ deadline: 1, createdAt: 1 }).lean(),
    RecoveryCheckIn.find({ procedure: { $in: ids } }).sort({ date: 1, createdAt: 1 }).lean(),
    RiskAssessment.find({ _id: { $in: procs.map((p) => p.discharge?.riskAssessment).filter(Boolean) } }).lean(),
    Patient.find({ _id: { $in: procs.map((p) => p.patient) } }).lean(),
    getRules(),
  ]);
  const by = (arr, key) => arr.reduce((m, x) => ((m[x[key].toString()] ||= []).push(x), m), {});
  const itemsBy = by(items, 'procedure');
  const ciBy = by(checkins, 'procedure');
  const riskById = Object.fromEntries(risks.map((r) => [r._id.toString(), r]));
  const patById = Object.fromEntries(patients.map((p) => [p._id.toString(), p]));
  const today = todayISO();
  return procs.map((p) => {
    const dto = toDto(p, itemsBy[p._id.toString()] || [], ciBy[p._id.toString()] || [], riskById[p.discharge?.riskAssessment?.toString()]);
    const r = ruleBased.cancellation(dto, patientRiskInput(patById[dto.patientId]), today, rules);
    dto.risk = r ? { ...r, source: 'rule-based' } : null;
    return dto;
  });
}
export async function loadCase(id) {
  const [c] = await loadCases({ _id: id });
  return c || null;
}
