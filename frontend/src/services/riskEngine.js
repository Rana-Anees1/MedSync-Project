import { diffDays } from '../utils/date';
import { readinessSummary, isPreop } from './workflow';

/**
 * PROTOTYPE STAND-IN FOR THE AI SERVICE.
 * These are transparent, weighted logistic functions that mimic the outputs the real models will give
 * (probability + explanation). Later they are replaced by calls to the Python ML service, e.g.
 *   POST /api/ai/cancellation-risk  { caseId }  ->  { probability, level, factors[] }
 * The UI only depends on the returned shape, so swapping the implementation is a one-file change.
 */
// IMPLEMENTED: transparent rule-based estimates. They are NOT machine-learning predictions.
// PLANNED: a trained model served by the Python AI service (see services/ai/riskProvider.js).
export const MODEL_INFO = {
  cancellation: { name: 'Rule-based readiness risk estimate', version: 'rules-0.1', type: 'rule-based' },
  complication: { name: 'Rule-based complication risk estimate', version: 'rules-0.1', type: 'rule-based' },
};

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

export function riskLevel(p, rules) {
  const t = rules?.risk || { high: 0.55, medium: 0.3 };
  return p >= t.high ? 'high' : p >= t.medium ? 'medium' : 'low';
}

export function cancellationRisk(c, patient, today, rules) {
  if (!isPreop(c) || !patient) return null;
  const s = readinessSummary(c);
  const days = diffDays(c.surgeryDate, today);
  const urgency = days <= 2 ? 1.5 : days <= 5 ? 1 : 0.45;
  const inactive = c.lastPatientActivity ? Math.min(diffDays(today, c.lastPatientActivity), 7) : 3;
  const comorb = (patient.comorbidities || []).length;
  const donor = c.items.find((i) => i.key === 'donors');
  const notCleared = !['READY', 'SCHEDULED'].includes(c.status);

  const terms = [
    { w: 0.95 * s.overdue, label: `${s.overdue} readiness item${s.overdue === 1 ? '' : 's'} overdue` },
    { w: 0.32 * s.pendingMandatory * urgency, label: `${s.pendingMandatory} required item${s.pendingMandatory === 1 ? '' : 's'} still open with ${Math.max(days, 0)} day${days === 1 ? '' : 's'} left` },
    { w: notCleared && days <= 3 ? 1.1 : 0, label: 'Not yet cleared by anaesthesia' },
    { w: inactive >= 2 ? 0.28 * inactive : 0, label: `Patient has not responded for ${inactive} days` },
    { w: donor && donor.status !== 'completed' && days <= 3 ? 0.6 : 0, label: 'Blood donor not arranged' },
    { w: comorb ? 0.3 * comorb : 0, label: `Comorbidities: ${(patient.comorbidities || []).join(', ')}` },
    { w: c.labs?.abnormal?.length ? 0.55 : 0, label: `Abnormal result: ${c.labs?.abnormal?.join(', ')}` },
    { w: patient.previousNoShow ? 0.8 : 0, label: 'Missed a previous hospital appointment' },
    { w: c.confirmations?.patient ? -0.9 : 0, label: 'Patient confirmed attendance' },
    { w: c.status === 'SCHEDULED' ? -1.2 : c.status === 'READY' ? -0.6 : 0, label: 'Case already cleared' },
  ];

  // 0.48 scales the summed evidence so outputs stay in a believable range (calibrated on the seed scenario)
  const z = -2.0 + 0.48 * terms.reduce((sum, t) => sum + t.w, 0);
  const probability = sigmoid(z);
  const factors = terms
    .filter((t) => Math.abs(t.w) > 0.05)
    .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
    .slice(0, 5)
    .map((t) => ({ label: t.label, impact: t.w, direction: t.w > 0 ? 'up' : 'down' }));

  return { probability, level: riskLevel(probability, rules), factors, model: MODEL_INFO.cancellation };
}

export function complicationRisk(c, patient, template) {
  if (!patient) return null;
  const terms = [
    { w: patient.age > 45 ? 0.03 * (patient.age - 45) : 0, label: `Age ${patient.age}` },
    { w: patient.comorbidities?.includes('Diabetes') ? 0.8 : 0, label: 'Diabetes' },
    { w: patient.smoker ? 0.6 : 0, label: 'Smoker' },
    { w: patient.bmi >= 30 ? 0.5 : 0, label: `BMI ${patient.bmi}` },
    { w: (template?.complicationBase || 0.2) * 1.5, label: 'Procedure type' },
    { w: c.operation?.durationMin > 100 ? 0.5 : 0, label: `Long operation (${c.operation?.durationMin} min)` },
    { w: c.labs?.abnormal?.length ? 0.4 : 0, label: 'Abnormal pre-op results' },
    { w: c.preopOverdueCount ? 0.15 * c.preopOverdueCount : 0, label: 'Delays during pre-op preparation' },
  ];
  const probability = sigmoid(-2.6 + terms.reduce((s, t) => s + t.w, 0));
  const tier = probability >= 0.3 ? 'high' : probability >= 0.16 ? 'medium' : 'low';
  const factors = terms.filter((t) => t.w > 0.05).sort((a, b) => b.w - a.w).slice(0, 4).map((t) => ({ label: t.label, impact: t.w, direction: 'up' }));
  return { probability, tier, factors, model: MODEL_INFO.complication };
}

/** Monitoring intensity chosen from the complication-risk tier (adaptive monitoring). */
export function recoveryPlanFor(tier, rules) {
  const r = rules.recovery[tier];
  return { tier, threshold: r.threshold, everyDays: r.everyDays, days: r.days };
}
