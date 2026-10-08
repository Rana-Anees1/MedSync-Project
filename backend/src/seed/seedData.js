/**
 * DEMO DATA ONLY. All people, numbers and records below are fictional and exist only to demonstrate MedSync.
 * Dates are relative to the day the seed runs, so the demo always looks current.
 */
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import ProcedureType from '../models/ProcedureType.js';
import Procedure from '../models/Procedure.js';
import ReadinessItem from '../models/ReadinessItem.js';
import RecoveryCheckIn from '../models/RecoveryCheckIn.js';
import RiskAssessment from '../models/RiskAssessment.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import Setting from '../models/Setting.js';
import { DEFAULT_RULES } from '../services/defaults.js';
import { generatePlan } from '../domain/planGenerator.js';
import { scoreCheckin } from '../domain/recoveryScoring.js';
import { complicationRisk, recoveryPlanFor } from '../domain/riskEngine.js';
import { addDays, todayISO } from '../domain/date.js';

export const DEMO_PASSWORD = 'Demo@1234';

const item = (key, title, titleUr, owner, offsetDays, description, extra = {}) => ({
  key, title, titleUr, owner, offsetDays, description, mandatory: true, patientTask: owner === 'patient', dayOf: false, category: 'investigation', priority: 'medium', ...extra,
});
const CBC = item('cbc', 'Complete blood count (CBC)', 'خون کا مکمل ٹیسٹ (سی بی سی)', 'patient', 5, 'Blood test at the hospital or an approved laboratory. Upload the report.', { priority: 'high' });
const ANAES = item('anaesth', 'Pre-anaesthesia assessment', 'بے ہوشی سے پہلے معائنہ', 'anaesthetist', 2, 'Assessment of fitness for anaesthesia, fasting and medicine instructions.', { category: 'assessment', priority: 'high' });
const CONSENT = item('consent', 'Informed consent signed', 'رضامندی فارم پر دستخط', 'surgeon', 2, 'Surgeon explains the procedure and records signed consent.', { category: 'consent', priority: 'high' });
const MEDHOLD = item('medhold', 'Hold medicines as advised by your doctor', 'ڈاکٹر کی ہدایت کے مطابق دوائیں روکیں', 'patient', 1, 'Follow the medicine instructions given by your anaesthetist.', { category: 'medication', dayOf: true });
const FASTING = item('fasting', 'Start fasting from midnight before surgery', 'آپریشن سے پہلے رات بارہ بجے کے بعد کچھ نہ کھائیں پئیں', 'patient', 0, 'Nothing to eat after midnight unless your anaesthetist advised otherwise.', { category: 'fasting', dayOf: true, priority: 'high' });
const DONOR = item('donors', 'Arrange one blood donor', 'ایک خون عطیہ کرنے والے کا انتظام کریں', 'patient', 2, 'One donor should visit the blood bank for screening before surgery.', { category: 'blood' });
const US_ABD = item('us_abd', 'Abdominal ultrasound report', 'پیٹ کا الٹراساؤنڈ', 'patient', 5, 'Upload the ultrasound report.');

const TYPES = [
  { code: 'tpl_lapchole', name: 'Laparoscopic cholecystectomy', durationMin: 75, complicationBase: 0.3, items: [CBC, item('lft', 'Liver function tests (LFT)', 'جگر کے ٹیسٹ (ایل ایف ٹی)', 'patient', 5, 'Blood test for liver function. Upload the report.', { priority: 'high' }), US_ABD, item('viral', 'Hepatitis B & C screening', 'ہیپاٹائٹس بی اور سی کا ٹیسٹ', 'patient', 5, 'Screening required before surgery.'), ANAES, CONSENT, DONOR, MEDHOLD, FASTING] },
  { code: 'tpl_hernia', name: 'Inguinal hernia repair (open mesh)', durationMin: 60, complicationBase: 0.2, items: [CBC, item('rbs', 'Random blood sugar', 'شوگر کا ٹیسٹ', 'patient', 5, 'Blood sugar test. Upload the report.'), item('ecg', 'ECG', 'ای سی جی', 'patient', 4, 'Electrocardiogram at the hospital ECG room.', { priority: 'high' }), ANAES, CONSENT, MEDHOLD, FASTING] },
  { code: 'tpl_thyroid', name: 'Total thyroidectomy', durationMin: 120, complicationBase: 0.35, items: [CBC, item('tft', 'Thyroid function tests', 'تھائیرائیڈ کے ٹیسٹ', 'patient', 5, 'Thyroid blood tests. Upload the report.', { priority: 'high' }), item('us_neck', 'Neck ultrasound report', 'گردن کا الٹراساؤنڈ', 'patient', 5, 'Upload the neck ultrasound report.'), item('ent', 'Vocal cord check (ENT referral)', 'گلے کا معائنہ (ای این ٹی)', 'coordinator', 4, 'Book the ENT vocal cord examination and record the result.', { category: 'referral' }), ANAES, CONSENT, DONOR, MEDHOLD, FASTING] },
  { code: 'tpl_appendix', name: 'Laparoscopic interval appendicectomy', durationMin: 60, complicationBase: 0.25, items: [CBC, US_ABD, ANAES, CONSENT, FASTING] },
  { code: 'tpl_pilonidal', name: 'Excision of pilonidal sinus', durationMin: 45, complicationBase: 0.4, items: [CBC, item('rbs', 'Random blood sugar', 'شوگر کا ٹیسٹ', 'patient', 5, 'Blood sugar test. Upload the report.'), ANAES, CONSENT, FASTING] },
];

const PATIENTS = [
  ['p1', 'MS-1001', 'Ayesha Bibi (demo)', 42, 'Female', '0301-5550142', 'Attock', 'ur', ['Diabetes'], 31, false, false, 'Imran (husband)'],
  ['p2', 'MS-1002', 'Muhammad Iqbal (demo)', 61, 'Male', '0333-5550388', 'Hazro', 'ur', ['Diabetes'], 28, true, false, 'Usman (son)'],
  ['p3', 'MS-1003', 'Ghulam Rasool (demo)', 58, 'Male', '0345-5550397', 'Fateh Jang', 'ur', ['Hypertension'], 26, false, true, 'Shahid (son)'],
  ['p4', 'MS-1004', 'Fatima Noor (demo)', 35, 'Female', '0312-5550421', 'Rawalpindi', 'en', [], 24, false, false, 'Ali (brother)'],
  ['p5', 'MS-1005', 'Zubair Hussain (demo)', 29, 'Male', '0300-5550405', 'Taxila', 'en', [], 23, false, false, 'Hamid (father)'],
  ['p6', 'MS-1006', 'Nasreen Akhtar (demo)', 50, 'Female', '0321-5550399', 'Wah Cantt', 'ur', ['Hypertension'], 29, false, false, 'Sadia (daughter)'],
  ['p7', 'MS-1007', 'Saima Parveen (demo)', 45, 'Female', '0302-5550376', 'Attock', 'ur', [], 27, false, false, 'Naveed (husband)'],
  ['p8', 'MS-1008', 'Tariq Mehmood (demo)', 39, 'Male', '0346-5550381', 'Hasan Abdal', 'ur', [], 30, true, false, 'Asif (brother)'],
  ['p9', 'MS-1009', 'Kamran Ali (demo)', 47, 'Male', '0334-5550430', 'Islamabad', 'en', [], 32, false, false, 'Nadia (wife)'],
  ['p10', 'MS-1010', 'Asma Shaheen (demo)', 38, 'Female', '0313-5550402', 'Attock', 'ur', ['Thyroid disorder'], 26, false, false, 'Kashif (husband)'],
  ['p11', 'MS-1011', 'Bilal Khan (demo)', 33, 'Male', '0311-5550455', 'Peshawar', 'en', [], 25, false, false, 'Sara (sister)'],
];

export async function seedDatabase() {
  const T = todayISO();
  const d = (n) => addDays(T, n);
  await Promise.all([User, Patient, ProcedureType, Procedure, ReadinessItem, RecoveryCheckIn, RiskAssessment, Notification, AuditLog, Setting].map((m) => m.deleteMany({})));
  await Setting.create({ key: 'rules', rules: DEFAULT_RULES });
  const types = Object.fromEntries((await ProcedureType.insertMany(TYPES)).map((t) => [t.code, t]));
  const pats = {};
  for (const [k, mrn, name, age, gender, phone, city, language, comorbidities, bmi, smoker, previousNoShow, attendant] of PATIENTS) {
    pats[k] = await Patient.create({ mrn, name, age, gender, phone, city, language, comorbidities, bmi, smoker, previousNoShow, attendant });
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const mk = (o) => User.create({ passwordHash, ...o });
  const U = {
    admin: await mk({ name: 'Imran Shah', email: 'admin@medsync.demo', role: 'admin', title: 'System administrator' }),
    sur1: await mk({ name: 'Dr. Farhan Qureshi', email: 'surgeon@medsync.demo', role: 'surgeon', title: 'Consultant General Surgeon' }),
    sur2: await mk({ name: 'Dr. Sana Malik', email: 'sana@medsync.demo', role: 'surgeon', title: 'Senior Registrar, Surgery' }),
    ana: await mk({ name: 'Dr. Hina Raza', email: 'anaesthetist@medsync.demo', role: 'anaesthetist', title: 'Consultant Anaesthetist' }),
    coo: await mk({ name: 'Nurse Rabia Khan', email: 'nurse@medsync.demo', role: 'coordinator', title: 'Pre-op nurse coordinator' }),
    pat1: await mk({ name: 'Ayesha Bibi (demo)', email: 'patient@medsync.demo', role: 'patient', title: 'Patient', patient: pats.p1._id }),
    pat2: await mk({ name: 'Muhammad Iqbal (demo)', email: 'recovery@medsync.demo', role: 'patient', title: 'Patient', patient: pats.p2._id }),
  };
  await mk({ name: 'Dr. Ahmed Raza (pending)', email: 'pending@medsync.demo', role: 'surgeon', title: 'Registrar', approval: 'pending' });
  const rules = DEFAULT_RULES;

  async function makeCase({ pat, type, surgeon, listed, surgery, stage, items = {}, allDone = false, assessment, labs, lastActivity = -1, confirmed, extra = {} }) {
    const patient = pats[pat]; const t = types[type];
    const listedOn = d(listed); const surgeryDate = d(surgery);
    const plan = generatePlan({ template: t.toObject(), patient: patient.toObject(), surgeryDate, today: listedOn, rules });
    const proc = await Procedure.create({
      patient: patient._id, procedureType: t._id, procedureName: t.name, surgeon: U[surgeon]._id, anaesthetist: U.ana._id, coordinator: U.coo._id,
      listedOn, surgeryDate, stage, labs: { abnormal: labs || [] }, lastPatientActivity: d(lastActivity),
      assessment: assessment || (allDone ? { date: d(surgery - 2), by: U.ana._id, asa: 'ASA II', airway: 'Mallampati II', fasting: 'Nothing to eat after midnight.', medicineHolds: 'As advised by the surgeon.', notes: 'Fit for surgery.' } : undefined),
      confirmations: confirmed != null ? { patient: d(confirmed) } : {},
      activity: [{ date: listedOn, actor: U[surgeon].name, text: `Listed for ${t.name} on ${surgeryDate}` }],
      ...extra,
    });
    const docs = plan.map(({ id, completedBy, ...it }) => {
      const ov = it.key in items ? items[it.key] : allDone && !it.dayOf ? ['completed', -1] : null;
      if (!ov) return { ...it, procedure: proc._id };
      const [status, when, note] = ov;
      return { ...it, procedure: proc._id, status, completedOn: ['completed', 'in_progress'].includes(status) ? d(when ?? -1) : undefined, completedBy: status === 'completed' ? ({ patient: U.coo._id, coordinator: U.coo._id, anaesthetist: U.ana._id, surgeon: U[surgeon]._id })[it.owner] : undefined, escalationLevel: status === 'overdue' ? when : 0, note: note || '' };
    });
    await ReadinessItem.insertMany(docs);
    return proc;
  }

  const c1 = await makeCase({ pat: 'p1', type: 'tpl_lapchole', surgeon: 'sur1', listed: -9, surgery: 4, stage: 'PREPARATION', items: { cbc: ['completed', -6], us_abd: ['completed', -5], viral: ['in_progress', -3, 'Uploaded: hepatitis_screening.jpg (demo record, no file)'], lft: ['overdue', 1] }, labs: ['Fasting sugar 168 mg/dL'], lastActivity: -3, extra: { preopOverdueCount: 1 } });
  c1.messages.push({ date: d(-5), from: U.sur1._id, text: 'Please get your LFT done at the hospital lab this week, and keep taking your diabetes medicine until we tell you to stop.' });
  await c1.save();
  const c2 = await makeCase({ pat: 'p3', type: 'tpl_hernia', surgeon: 'sur1', listed: -12, surgery: 2, stage: 'PREPARATION', items: { cbc: ['completed', -8], rbs: ['completed', -8], consent: ['completed', -4], ecg: ['overdue', 2], cardio: ['overdue', 1] }, lastActivity: -6, extra: { preopOverdueCount: 2, flags: { flaggedHigh: true } } });
  await makeCase({ pat: 'p4', type: 'tpl_thyroid', surgeon: 'sur2', listed: -2, surgery: 7, stage: 'PREPARATION', items: { cbc: ['completed', -1] } });
  await makeCase({ pat: 'p5', type: 'tpl_appendix', surgeon: 'sur1', listed: -10, surgery: 1, stage: 'READY', allDone: true, assessment: { date: d(-1), by: U.ana._id, asa: 'ASA I', airway: 'Mallampati I', fasting: 'Nothing to eat after midnight; clear water until 6 am.', medicineHolds: 'None', notes: 'Fit for general anaesthesia.', clearedBy: U.ana._id, clearedOn: d(-1) } });
  await makeCase({ pat: 'p6', type: 'tpl_lapchole', surgeon: 'sur2', listed: -14, surgery: 3, stage: 'READY', allDone: true, confirmed: -1 });
  await makeCase({ pat: 'p9', type: 'tpl_lapchole', surgeon: 'sur2', listed: 0, surgery: 10, stage: 'LISTED', lastActivity: 0 });
  await makeCase({ pat: 'p10', type: 'tpl_thyroid', surgeon: 'sur2', listed: -16, surgery: 14, stage: 'DEFERRED', allDone: true, labs: ['Free T4 raised'], extra: { deferral: { date: d(-3), by: U.ana._id, reason: 'Thyroid function not optimised (raised free T4). Endocrinology review needed before surgery.', newDate: d(14) } } });
  await makeCase({ pat: 'p8', type: 'tpl_pilonidal', surgeon: 'sur2', listed: -15, surgery: -2, stage: 'CANCELLED', allDone: true, extra: { cancellation: { date: d(-2), by: U.coo._id, category: 'Patient preparation', reason: 'Patient had breakfast on the morning of surgery; fasting instruction was not understood.' } } });

  async function recovery(pat, type, surgeon, opDay, duration, checkins, alerts = [], stage = 'RECOVERY') {
    const proc = await makeCase({ pat, type, surgeon, listed: opDay - 15, surgery: opDay, stage, allDone: true, items: { fasting: ['completed', opDay], medhold: ['completed', opDay - 1] } });
    proc.operation = { date: d(opDay), durationMin: duration, notes: 'Uneventful procedure.' };
    const patient = pats[pat].toObject();
    const risk = complicationRisk({ operation: proc.operation, labs: proc.labs, preopOverdueCount: proc.preopOverdueCount }, patient, types[type].toObject());
    const ra = await RiskAssessment.create({ procedure: proc._id, kind: 'complication', probability: risk.probability, level: risk.tier, factors: risk.factors, model: risk.model, date: d(opDay + 1) });
    proc.discharge = { date: d(opDay + 1), plan: recoveryPlanFor(risk.tier, rules), riskAssessment: ra._id };
    for (const ci of checkins) {
      const res = scoreCheckin(ci);
      await RecoveryCheckIn.create({ ...ci, date: d(ci.on), procedure: proc._id, patient: pats[pat]._id, ...res });
    }
    alerts.forEach((a) => proc.alerts.push({ ...a, date: d(a.on) }));
    await proc.save();
    return proc;
  }
  const base = { generalStatus: 'same', symptoms: [], wound: 'normal', eating: 'normal', mobility: 'limited', bleeding: false, breathless: false, notes: '' };
  const c6 = await recovery('p2', 'tpl_hernia', 'sur1', -5, 85, [
    { ...base, on: -4, temp: 37.2, pain: 5, eating: 'reduced' },
    { ...base, on: -3, temp: 37.4, pain: 4, generalStatus: 'better' },
    { ...base, on: -2, temp: 37.8, pain: 5, wound: 'red', notes: 'Wound feels warm.' },
    { ...base, on: -1, temp: 38.2, pain: 6, wound: 'swollen', eating: 'reduced', generalStatus: 'worse', symptoms: ['Fever', 'Wound swelling'], notes: 'More pain at night.' },
  ], [
    { on: -2, type: 'threshold', severity: 'medium', message: 'Score 3 reached the alert threshold: raised temperature, pain, redness around wound', status: 'advised', response: 'Keep the wound dry, take paracetamol as prescribed and check in again tomorrow.', respondedBy: U.sur1._id, respondedOn: d(-2) },
    { on: -1, type: 'trend', severity: 'high', message: 'Worsening for 3 check-ins in a row: fever 38.2°C, moderate pain, wound swelling', status: 'open' },
  ]);
  c6.messages.push({ date: d(-2), from: U.sur1._id, text: 'Keep the wound dry, take paracetamol as prescribed and check in again tomorrow.' });
  await c6.save();
  await recovery('p7', 'tpl_lapchole', 'sur2', -8, 70, [
    { ...base, on: -6, temp: 37.3, pain: 4 },
    { ...base, on: -4, temp: 37.0, pain: 3, mobility: 'normal', generalStatus: 'better' },
    { ...base, on: -2, temp: 36.9, pain: 2, mobility: 'normal', generalStatus: 'better', notes: 'Feeling much better.' },
  ]);
  const done = await recovery('p11', 'tpl_appendix', 'sur1', -22, 65, [
    { ...base, on: -20, temp: 37.1, pain: 4 }, { ...base, on: -18, temp: 36.8, pain: 2, mobility: 'normal', generalStatus: 'better' },
  ], [], 'RECOVERED');
  done.closedOn = d(-11); await done.save();

  const N = (o) => Notification.create({ date: T, kind: 'info', ...o });
  await N({ toRole: 'coordinator', kind: 'escalation', procedure: c2._id, title: 'Overdue: ECG', body: 'Ghulam Rasool (demo) · surgery in 2 days' });
  await N({ toUser: U.sur1._id, kind: 'escalation', procedure: c2._id, title: 'Still overdue: ECG', body: 'Ghulam Rasool (demo) needs attention before the operation.' });
  await N({ toUser: U.sur1._id, kind: 'alert', procedure: c6._id, title: 'Recovery alert for Muhammad Iqbal (demo)', body: 'Worsening for 3 check-ins in a row' });
  await N({ toRole: 'coordinator', kind: 'escalation', procedure: c1._id, title: 'Overdue: Liver function tests (LFT)', body: 'Ayesha Bibi (demo) · surgery in 4 days' });
  await N({ toRole: 'anaesthetist', procedure: c1._id, title: 'Assessment due: Ayesha Bibi (demo)', body: 'Laparoscopic cholecystectomy in 4 days' });
  await N({ toUser: U.pat1._id, kind: 'escalation', procedure: c1._id, title: 'Your liver function test is overdue', body: 'Please visit the hospital lab today.' });
  await N({ toUser: U.pat2._id, kind: 'reminder', procedure: c6._id, title: 'Your recovery check-in is due', body: 'It takes about one minute.' });
  await N({ toRole: 'admin', title: 'Staff account awaiting approval: Dr. Ahmed Raza (pending)', body: 'surgeon · pending@medsync.demo' });
  await AuditLog.create({ actorName: 'Seed script', action: 'Loaded DEMO DATA', target: 'Fictional patients, staff and procedures', date: T });
  return { users: await User.countDocuments(), patients: await Patient.countDocuments(), procedures: await Procedure.countDocuments() };
}
