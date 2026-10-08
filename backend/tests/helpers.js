import { DEFAULT_RULES } from '../src/services/defaults.js';

export const T = '2026-10-07';
export const rules = structuredClone(DEFAULT_RULES);
const item = (key, owner, offsetDays, extra = {}) => ({ key, title: key, titleUr: '', owner, offsetDays, mandatory: true, patientTask: owner === 'patient', dayOf: false, category: 'investigation', ...extra });
const TEMPLATES = [
  { id: 'tpl_hernia', items: [item('cbc', 'patient', 5), item('rbs', 'patient', 5), item('ecg', 'patient', 4), item('anaesth', 'anaesthetist', 2, { category: 'assessment' }), item('consent', 'surgeon', 2, { category: 'consent' }), item('medhold', 'patient', 1, { dayOf: true, category: 'medication' }), item('fasting', 'patient', 0, { dayOf: true, category: 'fasting' })], complicationBase: 0.2 },
  { id: 'tpl_appendix', items: [item('cbc', 'patient', 5), item('us_abd', 'patient', 5), item('anaesth', 'anaesthetist', 2, { category: 'assessment' }), item('consent', 'surgeon', 2, { category: 'consent' }), item('fasting', 'patient', 0, { dayOf: true, category: 'fasting' })], complicationBase: 0.25 },
  { id: 'tpl_lapchole', items: [item('cbc', 'patient', 5), item('lft', 'patient', 5), item('anaesth', 'anaesthetist', 2, { category: 'assessment' }), item('consent', 'surgeon', 2, { category: 'consent' }), item('donors', 'patient', 2, { category: 'blood' }), item('fasting', 'patient', 0, { dayOf: true, category: 'fasting' })], complicationBase: 0.3 },
];
export const tpl = (id) => TEMPLATES.find((t) => t.id === id);
export const patient = (over = {}) => ({ id: 'px', name: 'Test Patient', age: 40, gender: 'Female', comorbidities: [], bmi: 24, smoker: false, previousNoShow: false, ...over });
