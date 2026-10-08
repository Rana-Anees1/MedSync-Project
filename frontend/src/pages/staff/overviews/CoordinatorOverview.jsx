import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { IMAGES } from '../../../assets/images';
import { useAuth } from '../../../context/AuthContext';
import { useActions, useEnrichedCases, useLookup } from '../../../context/hooks';
import { useToast } from '../../../context/ToastContext';
import { diffDays, countdown, formatDate } from '../../../utils/date';
import { isPreop, canTransition } from '../../../services/workflow';
import { HeroBanner, Panel, Stat, EmptyState, Button, ItemStatusPill } from '../../../components/ui';
import { greeting } from './greeting';

export default function CoordinatorOverview() {
  const { user } = useAuth();
  const { today, rules } = useLookup();
  const actions = useActions();
  const { toast } = useToast();
  const cases = useEnrichedCases();
  const preop = cases.filter(isPreop);

  const openItems = preop.flatMap((c) => c.items.map((it) => ({ it, c })));
  const overdue = openItems.filter(({ it }) => it.status === 'overdue').sort((a, b) => diffDays(a.c.surgeryDate, b.c.surgeryDate));
  const toVerify = openItems.filter(({ it }) => it.status === 'in_progress');
  const toConfirm = preop.filter((c) => c.status === 'READY' && diffDays(c.surgeryDate, today) <= rules.confirmWithinDays);
  const silent = cases.filter((c) => (isPreop(c) || ['DISCHARGED', 'RECOVERY'].includes(c.status)) && diffDays(today, c.lastPatientActivity) >= 3);
  const tomorrow = preop.filter((c) => diffDays(c.surgeryDate, today) === 1);

  const confirm = async (c) => {
    const res = await actions.transition(c.id, 'confirm');
    (toast(res.ok ? `${c.patient.name} confirmed on the OT list.` : res.reason, res.ok ? 'success' : 'warning'));
  };

  return (
    <>
      <HeroBanner image={IMAGES.careTeam} title={greeting(user.name)}>Clear the overdue items first: each one is a possible cancellation on the day of surgery.</HeroBanner>
      <div className="stats">
        <Stat label="Overdue readiness items" value={overdue.length} tone={overdue.length ? 'bad' : 'ok'} to="/tasks" />
        <Stat label="Waiting for your check" value={toVerify.length} tone={toVerify.length ? 'warn' : 'ok'} to="/tasks" />
        <Stat label="Confirmations due" value={toConfirm.length} />
        <Stat label="On tomorrow's list" value={tomorrow.length} to="/board" />
      </div>

      <div className="grid grid--2">
        <Panel title="Overdue and escalated" actions={<Link to="/tasks" className="link">All tasks</Link>} flush>
          {overdue.length === 0 ? <EmptyState title="Nothing overdue" /> : (
            <ul className="task-list">
              {overdue.map(({ it, c }) => (
                <li key={it.id}>
                  <div>
                    <Link to={`/cases/${c.id}`} className="cell-title">{it.title}</Link>
                    <span className="cell-sub">{c.patient.name} · {countdown(c.surgeryDate, today)}</span>
                    <span className="cell-sub cell-sub--bad">{-diffDays(it.deadline, today)} day(s) late{it.escalationLevel === 2 ? ' · surgeon informed' : ''}</span>
                  </div>
                  <a className="btn btn--secondary btn--sm" href={`tel:${c.patient.phone}`}><Phone size={15} aria-hidden /><span>{c.patient.phone}</span></a>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Submitted by patients" subtitle="Check the upload, then verify or return it" flush>
          {toVerify.length === 0 ? <EmptyState title="No submissions waiting" /> : (
            <ul className="task-list">
              {toVerify.map(({ it, c }) => (
                <li key={it.id}>
                  <div>
                    <Link to={`/cases/${c.id}`} className="cell-title">{it.title}</Link>
                    <span className="cell-sub">{c.patient.name} · {it.note || 'Confirmed by patient'} · {formatDate(it.completedOn)}</span>
                  </div>
                  <Button size="sm" onClick={() => { actions.completeItem(c.id, it.id).then((ok) => ok && toast(`Verified: ${it.title}`)); }}>Verify</Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Confirm for the OT list" subtitle={`Cleared cases within ${rules.confirmWithinDays} days of surgery`} flush>
          {toConfirm.length === 0 ? <EmptyState title="No confirmations due" /> : (
            <ul className="task-list">
              {toConfirm.map((c) => (
                <li key={c.id}>
                  <div>
                    <Link to={`/cases/${c.id}`} className="cell-title">{c.patient.name}</Link>
                    <span className="cell-sub">{c.procedureName} · {formatDate(c.surgeryDate)}</span>
                    <span className="cell-sub">{c.confirmations?.patient ? `Patient confirmed on ${formatDate(c.confirmations.patient)}` : 'Patient has not confirmed yet'}</span>
                  </div>
                  <Button size="sm" onClick={() => confirm(c)} disabled={!canTransition(c, 'confirm', 'coordinator', today, rules).ok}>Confirm</Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Patients not responding" subtitle="No activity for 3 days or more" flush>
          {silent.length === 0 ? <EmptyState title="Every patient is responding" /> : (
            <ul className="task-list">
              {silent.map((c) => (
                <li key={c.id}>
                  <div>
                    <Link to={`/cases/${c.id}`} className="cell-title">{c.patient.name}</Link>
                    <span className="cell-sub">Last activity {formatDate(c.lastPatientActivity)} · attendant {c.patient.attendant}</span>
                  </div>
                  <a className="btn btn--secondary btn--sm" href={`tel:${c.patient.phone}`}><Phone size={15} aria-hidden /><span>Call</span></a>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
