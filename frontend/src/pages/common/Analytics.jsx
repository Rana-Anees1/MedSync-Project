import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Info } from 'lucide-react';
import { api } from '../../services/api';
import { useLookup } from '../../context/hooks';
import { CASE_STATUS, LIFECYCLE } from '../../config/constants';
import { formatDate } from '../../utils/date';
import { Panel, Stat, BarChart, LineChart, LoadingState, ErrorState, EmptyState, Button } from '../../components/ui';
import { IMAGES } from '../../assets/images';

const pctText = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);

export default function Analytics() {
  const { patient } = useLookup();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => { setBusy(true); api.get('/analytics').then((x) => { setD(x); setError(''); }).catch((e) => setError(e.message)).finally(() => setBusy(false)); };
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!d) return <LoadingState label="Calculating analytics…" />;
  const r = d.readiness;
  const alertsBy = (k) => d.recovery.alerts.filter((a) => a.type === k).reduce((s, a) => s + a.n, 0);
  const openAlerts = d.recovery.alerts.filter((a) => a.status === 'open').reduce((s, a) => s + a.n, 0);

  return (
    <>
      <div className="hero-banner">
        <img src={IMAGES.analyticsScreen} alt="" />
        <div>
          <h1>Analytics</h1>
          <p>Live figures calculated from the MedSync database. Last updated {new Date(d.generatedAt).toLocaleTimeString()}.</p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh'}</Button>
      </div>
      {d.totalProcedures === 0 ? (
        <Panel><EmptyState title="No procedures in the database yet">Analytics appear once patients are listed for surgery.</EmptyState></Panel>
      ) : (
        <>
          <div className="stats">
            <Stat label="Procedures in the next 7 days" value={d.upcoming.next7Days} note={`${d.upcoming.next14Days} in the next 14 days`} />
            <Stat label="Readiness completion (open cases)" value={pctText(r.completionRate)} note={`${r.byStatus.completed + r.byStatus.not_required} of ${r.totalItems} tasks`} tone="ok" />
            <Stat label="Overdue readiness tasks" value={r.byStatus.overdue} note={`${r.highPriorityOpen} high-priority tasks open`} tone={r.byStatus.overdue ? 'bad' : 'ok'} />
            <Stat label="Recovery check-ins (14 days)" value={d.recovery.checkinsLast14Days} note={`${openAlerts} alert(s) awaiting review`} tone={openAlerts ? 'warn' : 'neutral'} />
          </div>
          <div className="grid grid--2">
            <Panel title="Procedures by stage">
              <BarChart data={[...LIFECYCLE, 'DEFERRED', 'CANCELLED'].map((s) => ({ label: CASE_STATUS[s].label, value: d.stages[s] || 0, tone: s === 'CANCELLED' ? 'bad' : s === 'DEFERRED' ? 'warn' : 'brand' }))} />
            </Panel>
            <Panel title="Readiness tasks (cases before surgery)">
              {r.totalItems ? (
                <BarChart data={[
                  { label: 'Completed', value: r.byStatus.completed, tone: 'ok' }, { label: 'In progress', value: r.byStatus.in_progress, tone: 'warn' },
                  { label: 'Pending', value: r.byStatus.pending, tone: 'brand' }, { label: 'Overdue', value: r.byStatus.overdue, tone: 'bad' }, { label: 'Not required', value: r.byStatus.not_required },
                ]} />
              ) : <EmptyState title="No open readiness plans" />}
            </Panel>
            <Panel title="Readiness by upcoming case" flush>
              {d.readinessByCase.length ? (
                <ul className="case-bars">
                  {d.readinessByCase.map((c) => (
                    <li key={c.id}>
                      <Link to={`/cases/${c.id}`} className="cell-title">{patient(c.patientId)?.name || 'Patient'}</Link>
                      <span className="cell-sub">{c.procedureName} · {formatDate(c.surgeryDate)}</span>
                      <span className="bars__track"><span className={`bars__fill bars__fill--${c.overdue ? 'bad' : 'brand'}`} style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }} /></span>
                      <span className="small">{c.done}/{c.total}{c.overdue ? ` · ${c.overdue} overdue` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="No cases in preparation" />}
            </Panel>
            <Panel title="Readiness risk estimate" subtitle={`Method: ${d.risk.method}`}>
              <BarChart data={[{ label: 'High', value: d.risk.high, tone: 'bad' }, { label: 'Watch', value: d.risk.medium, tone: 'warn' }, { label: 'On track', value: d.risk.low, tone: 'ok' }]} />
              <p className="model-note"><Info size={14} aria-hidden /> Transparent rule-based scoring of readiness factors. A trained AI model is planned and is not running yet.</p>
            </Panel>
            <Panel title="Recovery check-ins, last 14 days" subtitle="Bars of red flags are counted inside the daily totals">
              {d.recovery.checkinsLast14Days ? (
                <LineChart labels={d.recovery.checkinsByDay.map((x) => formatDate(x.date, { day: 'numeric', month: 'short' }))} series={[{ label: 'Check-ins', values: d.recovery.checkinsByDay.map((x) => x.n) }]} height={200} />
              ) : <EmptyState title="No recovery check-ins in the last 14 days" />}
            </Panel>
            <Panel title="Recovery alerts and cancellations">
              <p className="small muted">Alerts by type</p>
              <BarChart data={[{ label: 'Red flag', value: alertsBy('redflag'), tone: 'bad' }, { label: 'Worsening trend', value: alertsBy('trend'), tone: 'warn' }, { label: 'Threshold', value: alertsBy('threshold'), tone: 'warn' }]} />
              <p className="small muted" style={{ marginTop: 16 }}>Cancellations by recorded reason</p>
              {d.cancellations.length ? <BarChart data={d.cancellations.map((c) => ({ label: c.category, value: c.n, tone: 'bad' }))} /> : <p className="muted small">No cancellations recorded.</p>}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
