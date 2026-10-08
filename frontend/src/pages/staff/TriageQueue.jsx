import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Phone } from 'lucide-react';
import { IMAGES } from '../../assets/images';
import { useAuth } from '../../context/AuthContext';
import { useActions, useEnrichedCases, useLookup } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { diffDays, formatDate } from '../../utils/date';
import { HeroBanner, Panel, Pill, AlertStatusPill, RiskBadge, Button, EmptyState, Tabs, Check } from '../../components/ui';
import AlertResponseModal from '../../components/case/AlertResponseModal';

const SEV = { critical: 0, high: 1, medium: 2 };

export default function TriageQueue() {
  const { user } = useAuth();
  const { today } = useLookup();
  const actions = useActions();
  const { toast } = useToast();
  const [onlyMine, setOnlyMine] = useState(true);
  const [tab, setTab] = useState('open');
  const [responding, setResponding] = useState(null);

  const cases = useEnrichedCases().filter((c) => c.discharge && (!onlyMine || c.surgeonId === user.id));
  const monitoring = cases.filter((c) => ['DISCHARGED', 'RECOVERY'].includes(c.status));
  const alerts = cases.flatMap((c) => c.alerts.map((a) => ({ a, c })));
  const open = alerts.filter(({ a }) => a.status === 'open').sort((x, y) => SEV[x.a.severity] - SEV[y.a.severity]);
  const handled = alerts.filter(({ a }) => a.status !== 'open').sort((x, y) => diffDays(y.a.date, x.a.date));

  return (
    <>
      <HeroBanner image={IMAGES.recoveryRoom} title="Recovery triage" actions={<Check label="Only my patients" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />}>
        Patients whose home check-ins crossed their alert threshold or got worse three days in a row.
      </HeroBanner>
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'open', label: 'Needs review', count: open.length },
        { value: 'handled', label: 'Handled', count: handled.length },
        { value: 'watch', label: 'Everyone on recovery watch', count: monitoring.length },
      ]} />

      {tab === 'open' && (open.length === 0 ? (
        <Panel><EmptyState icon={HeartPulse} title="No alerts need review">New alerts appear here as soon as a patient submits a worrying check-in.</EmptyState></Panel>
      ) : (
        <div className="triage">
          {open.map(({ a, c }) => (
            <article key={a.id} className={`triage-card triage-card--${a.severity}`}>
              <header>
                <Pill tone={a.severity === 'medium' ? 'warn' : 'bad'}>{a.severity === 'critical' ? 'Red flag' : a.type === 'trend' ? 'Worsening trend' : 'Threshold reached'}</Pill>
                <span className="small muted">{formatDate(a.date)} · day {diffDays(a.date, c.discharge.date)} after discharge</span>
              </header>
              <h2><Link to={`/cases/${c.id}`}>{c.patient.name}</Link></h2>
              <p className="muted small">{c.patient.age} y · {c.procedureName} · {c.discharge.plan.tier} risk plan</p>
              <p>{a.message}</p>
              <div className="triage-card__scores" aria-label="Recent recovery scores">
                {c.checkins.slice(-5).map((ci) => (
                  <span key={ci.id} className={`score-chip ${ci.score >= c.discharge.plan.threshold ? 'score-chip--bad' : ''}`} title={formatDate(ci.date)}>{ci.score}</span>
                ))}
                <span className="small muted">threshold {c.discharge.plan.threshold}</span>
              </div>
              <footer>
                <Button onClick={() => setResponding({ a, c })}>Respond</Button>
                <a className="btn btn--ghost" href={`tel:${c.patient.phone}`}><Phone size={16} aria-hidden /><span>Call</span></a>
                <Link className="btn btn--ghost" to={`/cases/${c.id}`}>Open case</Link>
              </footer>
            </article>
          ))}
        </div>
      ))}

      {tab === 'handled' && (
        <Panel flush>
          {handled.length === 0 ? <EmptyState title="No handled alerts yet" /> : (
            <ul className="alert-list">
              {handled.map(({ a, c }) => (
                <li key={a.id} className="alert-item">
                  <div>
                    <div className="alert-item__top"><strong>{c.patient.name}</strong><AlertStatusPill status={a.status} /><span className="small muted">{formatDate(a.date)}</span></div>
                    <p>{a.message}</p>
                    {a.response && <p className="small muted">Response: {a.response}</p>}
                  </div>
                  <Link className="link" to={`/cases/${c.id}`}>Open</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'watch' && (
        <Panel flush>
          <div className="table-wrap">
            <table className="table table--hover">
              <thead><tr><th>Patient</th><th>Day</th><th>Plan</th><th>Complication risk</th><th>Last check-in</th><th>Open alerts</th></tr></thead>
              <tbody>
                {monitoring.map((c) => {
                  const last = c.checkins.at(-1);
                  return (
                    <tr key={c.id}>
                      <td><Link className="cell-title" to={`/cases/${c.id}`}>{c.patient.name}</Link><span className="cell-sub">{c.procedureName}</span></td>
                      <td>{diffDays(today, c.discharge.date)} of {c.discharge.plan.days}</td>
                      <td>{c.discharge.plan.everyDays === 1 ? 'Daily' : `Every ${c.discharge.plan.everyDays} days`}</td>
                      <td><RiskBadge risk={{ ...c.discharge.risk, level: c.discharge.risk.tier }} /></td>
                      <td>{last ? `${formatDate(last.date)} · score ${last.score}` : 'None yet'}</td>
                      <td>{c.alerts.filter((x) => x.status === 'open').length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <AlertResponseModal
        alert={responding?.a}
        patientName={responding?.c.patient.name}
        onClose={() => setResponding(null)}
        onRespond={(status, text) => {
          actions.respondAlert(responding.c.id, responding.a.id, status, text).then((ok) => ok && toast(status === 'recalled' ? 'Patient recalled for review.' : status === 'advised' ? 'Advice sent to the patient.' : 'Alert resolved.'));
          setResponding(null);
        }}
      />
    </>
  );
}
