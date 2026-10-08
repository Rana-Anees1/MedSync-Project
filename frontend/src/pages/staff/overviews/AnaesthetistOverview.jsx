import { Link } from 'react-router-dom';
import { useEnrichedCases, useLookup } from '../../../context/hooks';
import { IMAGES } from '../../../assets/images';
import { useAuth } from '../../../context/AuthContext';
import { diffDays, countdown } from '../../../utils/date';
import { isPreop, canTransition } from '../../../services/workflow';
import { HeroBanner, Panel, Stat, EmptyState, RiskBadge } from '../../../components/ui';
import { greeting } from './greeting';

function QueueList({ cases, note }) {
  const { today } = useLookup();
  return (
    <ul className="attention">
      {cases.map((c) => (
        <li key={c.id}>
          <Link to={`/cases/${c.id}`} className="attention__row">
            <span className="attention__who">
              <strong>{c.patient.name}, {c.patient.age}</strong>
              <span>{c.procedureName} · {countdown(c.surgeryDate, today)}</span>
            </span>
            <span className="attention__why">{note(c)}</span>
            <RiskBadge risk={c.risk} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function AnaesthetistOverview() {
  const { user } = useAuth();
  const { today, rules } = useLookup();
  const preop = useEnrichedCases().filter(isPreop).sort((a, b) => diffDays(a.surgeryDate, b.surgeryDate));
  const toAssess = preop.filter((c) => !c.assessment);
  const assessed = preop.filter((c) => c.assessment && !['READY', 'SCHEDULED'].includes(c.status));
  const ready = assessed.filter((c) => canTransition(c, 'clear', 'anaesthetist', today, rules).ok);
  const waiting = assessed.filter((c) => !ready.includes(c));
  const week = preop.filter((c) => diffDays(c.surgeryDate, today) <= 7);

  return (
    <>
      <HeroBanner image={IMAGES.operatingTheatre} title={greeting(user.name)}>Assess patients early so medical problems are optimised before the operation, not discovered on the day.</HeroBanner>
      <div className="stats">
        <Stat label="Awaiting assessment" value={toAssess.length} tone={toAssess.length ? 'warn' : 'ok'} to="/assessments" />
        <Stat label="Ready to clear" value={ready.length} tone="ok" to="/assessments" />
        <Stat label="Assessed, waiting on other items" value={waiting.length} />
        <Stat label="Surgeries in the next 7 days" value={week.length} to="/board" />
      </div>
      <div className="grid grid--2">
        <Panel title="Assessment queue" subtitle="Earliest surgery first" actions={<Link className="link" to="/assessments">Open queue</Link>}>
          {toAssess.length ? <QueueList cases={toAssess} note={(c) => (c.patient.comorbidities.length ? c.patient.comorbidities.join(', ') : 'No comorbidities')} /> : <EmptyState title="Everyone on the list has been assessed" />}
        </Panel>
        <Panel title="Ready to clear">
          {ready.length ? <QueueList cases={ready} note={() => 'All required items complete'} /> : <EmptyState title="No cases ready to clear">Cases appear here once every required item is complete.</EmptyState>}
          {waiting.length > 0 && (
            <>
              <h3 className="subhead">Waiting on other items</h3>
              <QueueList cases={waiting} note={(c) => `${c.readiness.blockers.length} item(s) open: ${c.readiness.blockers.map((b) => b.title).join(', ')}`} />
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
