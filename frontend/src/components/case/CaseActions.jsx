import { useState } from 'react';
import { CheckCircle2, CalendarX2, PlayCircle, BadgeCheck, Ban, Scissors, DoorOpen, Flag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useActions, useLookup } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { availableActions } from '../../services/workflow';
import { complicationRisk, recoveryPlanFor } from '../../services/riskEngine';
import { CANCELLATION_CATEGORIES } from '../../config/constants';
import { addDays, formatDate } from '../../utils/date';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';
import RiskBadge from '../ui/RiskBadge';

const ICONS = { clear: CheckCircle2, defer: CalendarX2, resume: PlayCircle, confirm: BadgeCheck, cancel: Ban, operate: Scissors, discharge: DoorOpen, recover: Flag };
const VARIANT = { cancel: 'danger-ghost', defer: 'secondary' };
const DONE_MSG = {
  clear: 'Case cleared for surgery. The patient has been told.',
  defer: 'Case deferred. The coordinator and patient were notified.',
  resume: 'Workup resumed with updated deadlines.',
  confirm: 'Confirmed on the OT list.',
  cancel: 'Cancellation recorded with its reason.',
  operate: 'Operation recorded.',
  discharge: 'Patient discharged. Recovery watch has started.',
  recover: 'Case closed as recovered.',
};

export default function CaseActions({ c }) {
  const { user } = useAuth();
  const { today, rules, patient, template } = useLookup();
  const actions = useActions();
  const { toast } = useToast();
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({});
  const list = availableActions(c, user.role, today, rules);
  if (!list.length) return null;

  const start = (a) => {
    setForm({
      newDate: addDays(c.surgeryDate, 14),
      category: CANCELLATION_CATEGORIES[0],
      durationMin: template(c.templateId)?.durationMin || 60,
    });
    setOpen(a);
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const run = async () => {
    const res = await actions.transition(c.id, open, form);
    if (res?.ok === false) toast(res.reason, 'warning');
    else toast(DONE_MSG[open]);
    setOpen(null);
  };

  const preview =
    open === 'discharge'
      ? (() => {
          const r = complicationRisk({ ...c, operation: c.operation }, patient(c.patientId), template(c.templateId));
          return { r, plan: recoveryPlanFor(r.tier, rules) };
        })()
      : null;

  const valid =
    (open !== 'defer' || (form.reason && form.newDate)) &&
    (open !== 'cancel' || form.reason);

  const blocked = list.filter((a) => !a.ok);

  return (
    <div className="case-actions">
      <div className="case-actions__buttons">
        {list.map((a) => (
          <Button key={a.action} icon={ICONS[a.action]} variant={VARIANT[a.action] || 'primary'} disabled={!a.ok} onClick={() => start(a.action)} title={a.ok ? '' : a.reason}>
            {a.label}
          </Button>
        ))}
      </div>
      {blocked.map((a) => (
        <p key={a.action} className="case-actions__why">
          <strong>{a.label}:</strong> {a.reason}
        </p>
      ))}

      <Modal
        open={!!open}
        title={list.find((a) => a.action === open)?.label}
        onClose={() => setOpen(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(null)}>Go back</Button>
            <Button variant={open === 'cancel' ? 'danger' : 'primary'} onClick={run} disabled={!valid}>
              {list.find((a) => a.action === open)?.label}
            </Button>
          </>
        }
      >
        {open === 'clear' && <p>All required readiness items are complete. Clearing tells the patient to follow their fasting and medicine instructions for {formatDate(c.surgeryDate)}.</p>}
        {open === 'confirm' && (
          <p>
            Add {patient(c.patientId).name} to the OT list for {formatDate(c.surgeryDate)}.{' '}
            {c.confirmations?.patient ? `The patient confirmed attendance on ${formatDate(c.confirmations.patient)}.` : 'The patient has not confirmed attendance yet; consider calling them first.'}
          </p>
        )}
        {open === 'resume' && <p>Workup restarts for {formatDate(c.deferral?.newDate)}. Open items get new deadlines and the patient's list updates.</p>}
        {open === 'defer' && (
          <div className="form-grid">
            <Field label="Reason for deferral" className="span-2">{(id) => <Textarea id={id} value={form.reason || ''} onChange={set('reason')} placeholder="e.g. Blood sugar not controlled; refer to medicine" />}</Field>
            <Field label="Proposed new date">{(id) => <Input id={id} type="date" value={form.newDate} min={addDays(today, 1)} onChange={set('newDate')} />}</Field>
          </div>
        )}
        {open === 'cancel' && (
          <div className="form-grid">
            <Field label="Reason category" hint="Used in cancellation reports and to retrain the risk model">{(id) => <Select id={id} value={form.category} onChange={set('category')} options={CANCELLATION_CATEGORIES} />}</Field>
            <Field label="What happened?" className="span-2">{(id) => <Textarea id={id} value={form.reason || ''} onChange={set('reason')} />}</Field>
          </div>
        )}
        {open === 'operate' && (
          <div className="form-grid">
            <Field label="Duration (minutes)">{(id) => <Input id={id} type="number" min="10" value={form.durationMin} onChange={set('durationMin')} />}</Field>
            <Field label="Operation notes" className="span-2">{(id) => <Textarea id={id} value={form.notes || ''} onChange={set('notes')} placeholder="Findings, procedure, any intra-operative events" />}</Field>
          </div>
        )}
        {open === 'discharge' && preview && (
          <div className="stack">
            <p>MedSync estimated the risk of complications from this patient's pre-operative and surgical data and chose how closely to watch their recovery.</p>
            <div className="callout">
              <div className="callout__row"><span>Complication risk</span><RiskBadge risk={{ ...preview.r, level: preview.r.tier }} /></div>
              <div className="callout__row"><span>Check-ins</span><strong>{preview.plan.everyDays === 1 ? 'Every day' : `Every ${preview.plan.everyDays} days`} for {preview.plan.days} days</strong></div>
              <div className="callout__row"><span>Alert when score reaches</span><strong>{preview.plan.threshold}</strong></div>
              <p className="small muted">Main factors: {preview.r.factors.map((f) => f.label).join(', ') || 'none'}</p>
            </div>
          </div>
        )}
        {open === 'recover' && <p>Close the recovery watch for {patient(c.patientId).name}. Check-ins stop and the outcome is stored for reporting.</p>}
      </Modal>
    </div>
  );
}
