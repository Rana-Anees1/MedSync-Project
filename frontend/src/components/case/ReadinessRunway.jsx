import { diffDays, formatDate } from '../../utils/date';

const TONE = { done: 'ok', waived: 'ok', submitted: 'warn', overdue: 'bad', pending: 'neutral' };

/**
 * The runway: time from listing to the operation, with every readiness deadline placed on it.
 * Anything red to the left of "today" is a problem MedSync caught before the day of surgery.
 */
export default function ReadinessRunway({ c, today, compact = false }) {
  const W = compact ? 260 : 720;
  const H = compact ? 34 : 92;
  const pad = compact ? 6 : 22;
  const start = c.listedOn;
  const end = c.surgeryDate;
  const span = Math.max(1, diffDays(end, start));
  const x = (d) => pad + Math.min(1, Math.max(0, diffDays(d, start) / span)) * (W - pad * 2);
  const trackY = compact ? 17 : 38;
  const todayX = x(today);
  const stacks = {};

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`runway ${compact ? 'runway--compact' : ''}`} role="img"
      aria-label={`Readiness timeline from ${formatDate(start)} to surgery on ${formatDate(end)}`}>
      <line x1={pad} x2={W - pad} y1={trackY} y2={trackY} className="runway__track" />
      <line x1={pad} x2={todayX} y1={trackY} y2={trackY} className="runway__elapsed" />
      {c.items.map((it) => {
        const key = it.deadline;
        stacks[key] = (stacks[key] || 0) + 1;
        const n = stacks[key] - 1;
        const cy = trackY + (n % 2 === 0 ? -1 : 1) * Math.ceil(n / 2) * (compact ? 5 : 8);
        return (
          <circle key={it.id} cx={x(it.deadline)} cy={cy} r={compact ? 3.2 : 5} className={`runway__dot runway__dot--${TONE[it.status]}`}>
            <title>{`${it.title} · due ${formatDate(it.deadline)} · ${it.status}`}</title>
          </circle>
        );
      })}
      <line x1={todayX} x2={todayX} y1={trackY - (compact ? 13 : 22)} y2={trackY + (compact ? 13 : 22)} className="runway__today" />
      <g className="runway__surgery">
        <rect x={W - pad - (compact ? 5 : 7)} y={trackY - (compact ? 5 : 7)} width={compact ? 10 : 14} height={compact ? 10 : 14} rx="2" transform={`rotate(45 ${W - pad} ${trackY})`} />
      </g>
      {!compact && (
        <>
          <text x={pad} y={H - 8} className="runway__label">Listed {formatDate(start)}</text>
          <text x={todayX} y={14} textAnchor="middle" className="runway__label runway__label--today">Today</text>
          <text x={W - pad} y={H - 8} textAnchor="end" className="runway__label">Surgery {formatDate(end)}</text>
        </>
      )}
    </svg>
  );
}
