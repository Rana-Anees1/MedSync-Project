import { useState } from 'react';
import { Camera, Siren } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useActions, useLookup } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { formatDate, diffDays } from '../../utils/date';
import { WOUND_OPTIONS } from '../../services/recoveryScoring';
import Panel from '../ui/Panel';
import LineChart from '../ui/LineChart';
import RiskBadge from '../ui/RiskBadge';
import { AlertStatusPill, Pill } from '../ui/Pill';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import AlertResponseModal from './AlertResponseModal';

const woundLabel = (v) => WOUND_OPTIONS.find((w) => w.value === v)?.label || v;

export default function RecoveryPanel({ c }) {
  const { user } = useAuth();
  const { today, patient } = useLookup();
  const actions = useActions();
  const { toast } = useToast();
  const [responding, setResponding] = useState(null);

  if (!c.discharge) {
    return (
      <Panel title="Recovery watch">
        <EmptyState icon={Siren} title="Recovery watch starts at discharge">
          When the surgeon discharges the patient, MedSync estimates complication risk and sets how often the patient checks in.
        </EmptyState>
      </Panel>
    );
  }

  const { plan, risk } = c.discharge;
  const day = diffDays(today, c.discharge.date);
  const labels = c.checkins.map((ci) => `Day ${diffDays(ci.date, c.discharge.date)}`);

  return (
    <div className="stack">
      <div className="grid grid--3">
        <Panel title="Complication risk" actions={<RiskBadge risk={{ ...risk, level: risk.tier }} />}>
          <p className="small muted">{risk.factors.map((f) => f.label).join(', ') || 'No major factors'}</p>
        </Panel>
        <Panel title="Monitoring plan">
          <p><strong>{plan.everyDays === 1 ? 'Daily' : `Every ${plan.everyDays} days`}</strong> for {plan.days} days</p>
          <p className="small muted">Alert at score {plan.threshold} or a 3-day worsening trend</p>
        </Panel>
        <Panel title="Progress">
          <p><strong>Day {Math.min(day, plan.days)}</strong> of {plan.days}</p>
          <p className="small muted">Discharged {formatDate(c.discharge.date)} · {c.checkins.length} check-ins</p>
        </Panel>
      </div>

      <Panel title="Recovery score trend" subtitle="Higher scores mean more warning signs">
        {c.checkins.length ? (
          <LineChart labels={labels} threshold={plan.threshold} series={[{ label: 'Recovery score', values: c.checkins.map((ci) => ci.score), tone: 'brand' }]} />
        ) : (
          <p className="muted">No check-ins yet.</p>
        )}
      </Panel>

      <Panel title="Alerts" flush>
        {c.alerts.length === 0 ? (
          <EmptyState title="No alerts">Recovery is within the expected range.</EmptyState>
        ) : (
          <ul className="alert-list">
            {[...c.alerts].reverse().map((a) => (
              <li key={a.id} className={`alert-item alert-item--${a.severity}`}>
                <div>
                  <div className="alert-item__top">
                    <Pill tone={a.severity === 'medium' ? 'warn' : 'bad'}>{a.severity === 'critical' ? 'Red flag' : a.type === 'trend' ? 'Worsening trend' : 'Threshold'}</Pill>
                    <AlertStatusPill status={a.status} />
                    <span className="small muted">{formatDate(a.date)}</span>
                  </div>
                  <p>{a.message}</p>
                  {a.response && <p className="small muted">Response: {a.response}</p>}
                </div>
                {user.role === 'surgeon' && a.status === 'open' && (
                  <Button size="sm" onClick={() => setResponding(a)}>Respond</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Check-in history" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Temp</th><th>Pain</th><th>Wound</th><th>Eating</th><th>Score</th></tr>
            </thead>
            <tbody>
              {[...c.checkins].reverse().map((ci) => (
                <tr key={ci.id} className={ci.redFlag ? 'row--bad' : ''}>
                  <td>{formatDate(ci.date)}</td>
                  <td>{ci.temp}°C</td>
                  <td>{ci.pain}/10</td>
                  <td>{woundLabel(ci.wound)} {ci.photo && <Camera size={14} aria-label="Photo attached" />}</td>
                  <td className="cap">{ci.eating}</td>
                  <td><strong>{ci.score}</strong>{ci.redFlag && <span className="cell-sub cell-sub--bad">Red flag</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <AlertResponseModal
        alert={responding}
        patientName={patient(c.patientId).name}
        onClose={() => setResponding(null)}
        onRespond={(status, text) => {
          actions.respondAlert(c.id, responding.id, status, text).then((ok) => ok && toast(status === 'recalled' ? 'Patient recalled for review.' : status === 'advised' ? 'Advice sent to the patient.' : 'Alert resolved.'));
          setResponding(null);
        }}
      />
    </div>
  );
}
