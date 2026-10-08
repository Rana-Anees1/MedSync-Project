import { Link } from 'react-router-dom';
import { useLookup } from '../../../context/hooks';
import { countdown } from '../../../utils/date';
import RiskBadge from '../../../components/ui/RiskBadge';

/** Cases ranked by predicted cancellation risk, each with the main reason. */
export default function AttentionList({ cases }) {
  const { today } = useLookup();
  return (
    <ul className="attention">
      {cases.map((c) => (
        <li key={c.id}>
          <Link to={`/cases/${c.id}`} className="attention__row">
            <span className="attention__who">
              <strong>{c.patient.name}</strong>
              <span>{c.procedureName} · {countdown(c.surgeryDate, today)}</span>
            </span>
            <span className="attention__why">{c.risk?.factors[0]?.label}</span>
            <RiskBadge risk={c.risk} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
