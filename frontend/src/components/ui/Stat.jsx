import { Link } from 'react-router-dom';

export default function Stat({ label, value, note, tone = 'neutral', to }) {
  const body = (
    <>
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
      {note && <span className="stat__note">{note}</span>}
    </>
  );
  return to ? (
    <Link to={to} className={`stat stat--${tone}`}>{body}</Link>
  ) : (
    <div className={`stat stat--${tone}`}>{body}</div>
  );
}
