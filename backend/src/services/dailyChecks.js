import Procedure from '../models/Procedure.js';
import ReadinessItem from '../models/ReadinessItem.js';
import RecoveryCheckIn from '../models/RecoveryCheckIn.js';
import RiskAssessment from '../models/RiskAssessment.js';
import Patient from '../models/Patient.js';
import { PREOP_STATES, RECOVERY_STATES } from '../domain/constants.js';
import { diffDays, todayISO } from '../domain/date.js';
import { getRules } from './rules.js';
import { notify, audit, logActivity, patientUserOf } from './notify.js';
import { toDto, patientRiskInput } from './caseDto.js';
import { estimateCancellation } from './ai/riskProvider.js';

/**
 * Daily readiness and recovery checks (runs on a cron schedule and can be triggered by an administrator).
 * Idempotent per day: escalation levels and "last sent" markers prevent duplicate notifications.
 */
export async function runDailyChecks({ today = todayISO(), actor = null } = {}) {
  const rules = await getRules();
  let events = 0;
  const procs = await Procedure.find({ stage: { $in: [...PREOP_STATES, ...RECOVERY_STATES] } });
  for (const p of procs) {
    const patient = await Patient.findById(p.patient).lean();
    if (!patient) continue;
    const pUser = await patientUserOf(p.patient);
    const days = diffDays(p.surgeryDate, today);
    const flags = { ...(p.flags || {}) };

    if (PREOP_STATES.includes(p.stage)) {
      const items = await ReadinessItem.find({ procedure: p._id });
      for (const it of items) {
        if (['completed', 'not_required', 'in_progress'].includes(it.status)) continue;
        const left = diffDays(it.deadline, today);
        if (it.status === 'pending' && left < 0) {
          it.status = 'overdue'; it.escalationLevel = 1;
          p.preopOverdueCount = (p.preopOverdueCount || 0) + 1;
          logActivity(p, 'MedSync', `"${it.title}" is overdue and was escalated to the pre-op coordinator`);
          await notify({ to: { role: 'coordinator' }, kind: 'escalation', procedure: p, title: `Overdue: ${it.title}`, body: `${patient.name} · surgery ${days === 1 ? 'tomorrow' : `in ${days} days`}` });
          events++;
        } else if (it.status === 'overdue' && -left >= rules.escalateToSurgeonAfterDays && it.escalationLevel < 2) {
          it.escalationLevel = 2;
          logActivity(p, 'MedSync', `"${it.title}" is still overdue and was escalated to the surgeon`);
          await notify({ to: { user: p.surgeon }, kind: 'escalation', procedure: p, title: `Still overdue: ${it.title}`, body: `${patient.name} needs attention before the operation.` });
          events++;
        }
        if (it.patientTask && it.status === 'pending' && pUser && it.lastReminderOn !== today && (left === 0 || rules.reminderDaysBefore.includes(left))) {
          it.lastReminderOn = today;
          await notify({ to: { user: pUser }, kind: 'reminder', procedure: p, title: left === 0 ? `Due today: ${it.title}` : `Reminder: ${it.title}`, body: left === 0 ? 'Please complete this today.' : `Due in ${left} day${left === 1 ? '' : 's'}.` });
          events++;
        }
        if (it.isModified()) await it.save();
      }
      const dto = toDto(p.toObject(), items.map((i) => i.toObject()), []);
      const risk = await estimateCancellation(dto, patientRiskInput(patient), today, rules);
      if (risk?.level === 'high' && !flags.flaggedHigh) {
        flags.flaggedHigh = true;
        const top = risk.factors[0]?.label || '';
        await RiskAssessment.create({ procedure: p._id, kind: 'cancellation', probability: risk.probability, level: risk.level, factors: risk.factors, model: risk.model, date: today });
        logActivity(p, 'MedSync', `Readiness risk estimate rose to ${Math.round(risk.probability * 100)}% (${top})`);
        await notify({ to: { user: p.surgeon }, kind: 'risk', procedure: p, title: `${patient.name} is at high risk of cancellation`, body: top });
        await notify({ to: { role: 'coordinator' }, kind: 'risk', procedure: p, title: `High cancellation risk: ${patient.name}`, body: top });
        events += 2;
      } else if (risk && risk.level !== 'high') flags.flaggedHigh = false;

      if (p.stage === 'READY' && days >= 0 && days <= rules.confirmWithinDays && !flags.confirmAsked) {
        flags.confirmAsked = true;
        await notify({ to: { role: 'coordinator' }, kind: 'info', procedure: p, title: `Confirm ${patient.name} for the OT list`, body: `Surgery ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}.` });
        if (pUser) await notify({ to: { user: pUser }, kind: 'reminder', procedure: p, title: 'Please confirm you are coming for your operation', body: 'Open MedSync and tap "I will come".' });
        events += 2;
      }
      if (days < 0 && !flags.datePassed) {
        flags.datePassed = true;
        await notify({ to: { role: 'coordinator' }, kind: 'escalation', procedure: p, title: `Surgery date passed for ${patient.name}`, body: 'Record the outcome: completed, deferred or cancelled.' });
        events++;
      }
    }

    if (RECOVERY_STATES.includes(p.stage) && p.discharge?.plan) {
      const plan = p.discharge.plan;
      const last = await RecoveryCheckIn.findOne({ procedure: p._id }).sort({ date: -1 }).lean();
      const since = diffDays(today, last?.date || p.discharge.date);
      if (since >= plan.everyDays && pUser && flags.lastCheckinReminder !== today) {
        flags.lastCheckinReminder = today;
        await notify({ to: { user: pUser }, kind: 'reminder', procedure: p, title: 'Your recovery check-in is due', body: 'It takes about one minute.' });
        events++;
      }
      if (since >= plan.everyDays * 2 + 1 && !flags.silent) {
        flags.silent = true;
        await notify({ to: { role: 'coordinator' }, kind: 'escalation', procedure: p, title: `No check-in from ${patient.name} for ${since} days`, body: 'Please call the patient.' });
        events++;
      }
      if (diffDays(today, p.discharge.date) >= plan.days && !flags.watchEnded) {
        flags.watchEnded = true;
        await notify({ to: { user: p.surgeon }, kind: 'info', procedure: p, title: `Recovery watch period finished for ${patient.name}`, body: 'Review and close the case.' });
        events++;
      }
    }
    p.flags = flags;
    p.markModified('flags');
    await p.save();
  }
  await audit(actor, 'Daily checks ran', `${events} reminders/escalations`);
  return { events, checked: procs.length, date: today };
}
