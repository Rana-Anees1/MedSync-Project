import { addDays, diffDays, maxDate } from './date.js';
import { uid } from './id.js';

/**
 * Builds a readiness plan from a procedure template plus the hospital's conditional rules.
 * Every item gets an owner and a deadline counted back from the surgery date.
 * Backend later: POST /api/cases will run the same logic server-side.
 */
export function generatePlan({ template, patient, surgeryDate, today, rules }) {
  const conditional = (rules?.conditionalItems || [])
    .filter((c) => patient.comorbidities?.includes(c.when))
    .map((c) => ({ ...c.item, reason: `Added because of ${c.when.toLowerCase()}` }));

  const seen = new Set();
  return [...template.items, ...conditional]
    .filter((it) => (seen.has(it.key) ? false : seen.add(it.key)))
    .map((it) => ({
      id: uid('it'),
      key: it.key,
      title: it.title,
      titleUr: it.titleUr,
      owner: it.owner,
      category: it.category,
      description: it.description || '',
      priority: it.priority || 'medium',
      mandatory: it.mandatory,
      patientTask: it.patientTask,
      dayOf: it.dayOf,
      reason: it.reason || null,
      deadline: maxDate(addDays(surgeryDate, -it.offsetDays), today),
      offsetDays: it.offsetDays,
      status: 'pending',
      escalationLevel: 0,
      completedOn: null,
      completedBy: null,
      note: '',
    }))
    .sort((a, b) => diffDays(a.deadline, b.deadline));
}

/** Re-anchors open items to a new surgery date (used when a deferred case resumes). */
export function rescheduleItems(items, newDate, today) {
  return items.map((it) =>
    it.status === 'completed' || it.status === 'not_required'
      ? it
      : { ...it, status: 'pending', escalationLevel: 0, deadline: maxDate(addDays(newDate, -it.offsetDays), today) }
  );
}
