import { Link } from 'react-router-dom';
import { CalendarCheck2, ShieldCheck } from 'lucide-react';
import { IMAGES } from '../../../assets/images';
import { useAuth } from '../../../context/AuthContext';
import { useEnrichedCases, useLookup } from '../../../context/hooks';
import { diffDays, formatDate } from '../../../utils/date';
import { isPreop } from '../../../services/workflow';
import { HeroBanner, Panel, Stat, EmptyState, Pill } from '../../../components/ui';
import CaseTable from '../../../components/case/CaseTable';
import AttentionList from './AttentionList';
import { greeting } from './greeting';

export default function SurgeonOverview() {
  const { user } = useAuth();
  const { today } = useLookup();
  const mine = useEnrichedCases().filter((c) => c.surgeonId === user.id);
  const upcoming = mine.filter((c) => isPreop(c) && diffDays(c.surgeryDate, today) <= 7 && diffDays(c.surgeryDate, today) >= 0);
  const risky = mine.filter((c) => c.risk && c.risk.level !== 'low').sort((a, b) => b.risk.probability - a.risk.probability);
  const watching = mine.filter((c) => ['DISCHARGED', 'RECOVERY'].includes(c.status));
  const alerts = watching.flatMap((c) => c.alerts.filter((a) => a.status === 'open').map((a) => ({ ...a, c })));

  return (
    <>
      <HeroBanner image={IMAGES.doctor} title={greeting(user.name)} actions={<Link to="/cases/new" className="btn btn--primary"><CalendarCheck2 size={17} aria-hidden /><span>List a patient</span></Link>}>
        Your elective list, the cases at risk of cancellation and patients recovering at home.
      </HeroBanner>

      <div className="stats">
        <Stat label="Operations in the next 7 days" value={upcoming.length} to="/board" />
        <Stat label="At risk of cancellation" value={risky.filter((c) => c.risk.level === 'high').length} note={`${risky.length} need attention`} tone="bad" to="/board" />
        <Stat label="Open recovery alerts" value={alerts.length} tone={alerts.length ? 'bad' : 'ok'} to="/triage" />
        <Stat label="Under recovery watch" value={watching.length} to="/triage" />
      </div>

      <div className="grid grid--main">
        <Panel title="Act before the day of surgery" subtitle="Ranked by predicted cancellation risk" actions={<Link to="/board" className="link">Readiness board</Link>}>
          {risky.length ? <AttentionList cases={risky} /> : <EmptyState icon={ShieldCheck} title="Every upcoming case is on track" />}
        </Panel>

        <Panel title="Recovery alerts" actions={<Link to="/triage" className="link">Triage queue</Link>}>
          {alerts.length === 0 ? (
            <EmptyState title="No open alerts">Patients' check-ins are within their expected range.</EmptyState>
          ) : (
            <ul className="mini-alerts">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link to={`/cases/${a.c.id}`}>
                    <Pill tone="bad">{a.type === 'trend' ? 'Worsening' : a.severity === 'critical' ? 'Red flag' : 'Threshold'}</Pill>
                    <strong>{a.c.patient.name}</strong>
                    <span>{a.message}</span>
                    <small>{formatDate(a.date)}</small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="This week's operating list" flush>
        {upcoming.length ? <CaseTable cases={upcoming} /> : <EmptyState title="No operations in the next 7 days" />}
      </Panel>
    </>
  );
}
