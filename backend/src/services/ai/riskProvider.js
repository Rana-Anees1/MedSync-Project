import { cancellationRisk, complicationRisk, recoveryPlanFor } from '../../domain/riskEngine.js';
import { env } from '../../config/env.js';

/**
 * Service boundary for risk analysis.
 *
 * IMPLEMENTED: rule-based estimates from domain/riskEngine.js (labelled model.type = 'rule-based').
 * PLANNED:     a trained model in the Python AI service (ai-service/). When AI_SERVICE_URL is set and the
 *              service returns a prediction whose model.type is 'ml', that prediction is used; otherwise the
 *              rule-based estimate is returned with `source: 'rule-based'`. Nothing here pretends to be AI.
 */
export const ruleBased = { cancellation: cancellationRisk, complication: complicationRisk, plan: recoveryPlanFor };

async function callAi(path, payload) {
  if (!env.aiServiceUrl) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${env.aiServiceUrl.replace(/\/$/, '')}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null; // e.g. 501 Not Implemented while no model is trained
    const data = await res.json();
    return data?.model?.type === 'ml' ? { ...data, source: 'ai-service' } : null;
  } catch {
    return null;
  }
}

export async function estimateCancellation(caseDto, patient, today, rules) {
  const ai = await callAi('/v1/risk/cancellation', { case: caseDto, patient, today });
  return ai || withSource(cancellationRisk(caseDto, patient, today, rules));
}
export async function estimateComplication(caseDto, patient, template) {
  const ai = await callAi('/v1/risk/complication', { case: caseDto, patient });
  return ai || withSource(complicationRisk(caseDto, patient, template));
}
const withSource = (r) => (r ? { ...r, source: 'rule-based' } : r);
export const aiStatus = () => ({ configured: Boolean(env.aiServiceUrl), url: env.aiServiceUrl || null, implemented: 'rule-based', planned: 'Python FastAPI service with trained models' });
