const LABEL = { high: 'High risk', medium: 'Watch', low: 'On track' };
const TONE = { high: 'bad', medium: 'warn', low: 'ok' };

/** Cancellation-risk badge: a small gauge + label. Shows "—" when risk does not apply. */
export default function RiskBadge({ risk, showPct = true, size = 'md' }) {
  if (!risk) return <span className="muted">—</span>;
  const pct = Math.round(risk.probability * 100);
  const level = risk.level || risk.tier;
  return (
    <span className={`risk risk--${TONE[level]} risk--${size}`} title={`Predicted cancellation risk ${pct}%`}>
      <svg viewBox="0 0 36 20" className="risk__gauge" aria-hidden>
        <path d="M3 18a15 15 0 0 1 30 0" className="risk__track" />
        <path d="M3 18a15 15 0 0 1 30 0" className="risk__fill" pathLength="100" strokeDasharray={`${pct} 100`} />
      </svg>
      <span className="risk__text">
        {LABEL[level]}
        {showPct && <b>{pct}%</b>}
      </span>
    </span>
  );
}
