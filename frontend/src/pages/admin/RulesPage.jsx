import { useState } from 'react';
import { Save } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useActions } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Panel, Button, Field, Input } from '../../components/ui';

export default function RulesPage() {
  const { state } = useStore();
  const actions = useActions();
  const { toast } = useToast();
  const [r, setR] = useState(() => structuredClone(state.rules));
  const [reminders, setReminders] = useState(state.rules.reminderDaysBefore.join(', '));

  const setTier = (tier, k, v) => setR((x) => ({ ...x, recovery: { ...x.recovery, [tier]: { ...x.recovery[tier], [k]: Number(v) } } }));
  const save = () => {
    const days = reminders.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n >= 0);
    actions.saveRules({ ...r, reminderDaysBefore: days }).then((ok) => ok && toast('Rules saved. They apply from the next daily check.'));
  };

  return (
    <>
      <PageHeader title="Reminder & alert rules" actions={<Button icon={Save} onClick={save}>Save rules</Button>}>
        The hospital decides when patients are reminded, when overdue work escalates and when a recovery check-in raises an alert.
      </PageHeader>
      <div className="grid grid--2">
        <Panel title="Before surgery">
          <div className="form-grid">
            <Field label="Remind patients (days before each deadline)" hint="Comma separated, e.g. 3, 1" className="span-2">{(id) => <Input id={id} value={reminders} onChange={(e) => setReminders(e.target.value)} />}</Field>
            <Field label="Escalate to surgeon after (days overdue)">{(id) => <Input id={id} type="number" min="0" value={r.escalateToSurgeonAfterDays} onChange={(e) => setR({ ...r, escalateToSurgeonAfterDays: Number(e.target.value) })} />}</Field>
            <Field label="Confirm for OT list within (days)">{(id) => <Input id={id} type="number" min="1" value={r.confirmWithinDays} onChange={(e) => setR({ ...r, confirmWithinDays: Number(e.target.value) })} />}</Field>
            <Field label="High cancellation risk from (%)">{(id) => <Input id={id} type="number" min="1" max="99" value={Math.round(r.risk.high * 100)} onChange={(e) => setR({ ...r, risk: { ...r.risk, high: Number(e.target.value) / 100 } })} />}</Field>
            <Field label="Watch from (%)">{(id) => <Input id={id} type="number" min="1" max="99" value={Math.round(r.risk.medium * 100)} onChange={(e) => setR({ ...r, risk: { ...r.risk, medium: Number(e.target.value) / 100 } })} />}</Field>
          </div>
        </Panel>
        <Panel title="After discharge" subtitle="Monitoring intensity per complication-risk tier" flush>
          <div className="table-wrap">
            <table className="table table--edit">
              <thead><tr><th>Risk tier</th><th>Alert at score</th><th>Check-in every (days)</th><th>Watch for (days)</th></tr></thead>
              <tbody>
                {['high', 'medium', 'low'].map((tier) => (
                  <tr key={tier}>
                    <td className="cap"><strong>{tier}</strong></td>
                    <td><Input aria-label={`${tier} threshold`} type="number" min="1" value={r.recovery[tier].threshold} onChange={(e) => setTier(tier, 'threshold', e.target.value)} /></td>
                    <td><Input aria-label={`${tier} frequency`} type="number" min="1" value={r.recovery[tier].everyDays} onChange={(e) => setTier(tier, 'everyDays', e.target.value)} /></td>
                    <td><Input aria-label={`${tier} duration`} type="number" min="1" value={r.recovery[tier].days} onChange={(e) => setTier(tier, 'days', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted panel-note">Red flags (temperature 39°C or more, bleeding, opened wound, chest pain or breathlessness) always send the patient to Emergency, whatever the score.</p>
        </Panel>
      </div>
    </>
  );
}
