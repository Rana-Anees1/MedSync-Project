import { useNavigate, Link } from 'react-router-dom';
import { useLookup } from '../../context/hooks';
import { countdown, formatDate } from '../../utils/date';
import { StatusPill } from '../ui/Pill';
import RiskBadge from '../ui/RiskBadge';
import Meter from '../ui/Meter';
import ReadinessRunway from './ReadinessRunway';
import { isPreop } from '../../services/workflow';

/** Table of enriched cases used by the readiness board and dashboards. */
export default function CaseTable({ cases, showRunway = true, showSurgeon = false }) {
  const { today } = useLookup();
  const navigate = useNavigate();
  return (
    <div className="table-wrap">
      <table className="table table--hover">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Surgery</th>
            {showRunway && <th className="hide-md">Readiness timeline</th>}
            <th>Readiness</th>
            <th>Cancellation risk</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className={c.risk?.level === 'high' ? 'row--risk' : ''}>
              <td>
                <Link to={`/cases/${c.id}`} className="cell-title" onClick={(e) => e.stopPropagation()}>{c.patient.name}</Link>
                <span className="cell-sub">{c.procedureName}{showSurgeon ? ` · ${c.surgeon?.name}` : ''}</span>
              </td>
              <td className="nowrap">
                {formatDate(c.surgeryDate)}
                <span className={`cell-sub ${isPreop(c) && c.surgeryDate <= today ? 'cell-sub--bad' : ''}`}>{countdown(c.surgeryDate, today)}</span>
              </td>
              {showRunway && (
                <td className="hide-md runway-cell">{isPreop(c) ? <ReadinessRunway c={c} today={today} compact /> : <span className="muted small">—</span>}</td>
              )}
              <td className="readiness-cell">
                <Meter value={c.readiness.pct} tone={c.readiness.overdue ? 'bad' : c.readiness.pct === 1 ? 'ok' : 'brand'} label={`${c.readiness.done} of ${c.readiness.total} items done`} />
                <span className="cell-sub">
                  {c.readiness.done}/{c.readiness.total} done
                  {c.readiness.overdue > 0 && <b className="text-bad"> · {c.readiness.overdue} overdue</b>}
                </span>
              </td>
              <td><RiskBadge risk={c.risk} /></td>
              <td><StatusPill status={c.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
