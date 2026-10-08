export default function Meter({ value, tone, label }) {
  const pct = Math.round(value * 100);
  const t = tone || 'brand';
  return (
    <div className="meter" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
      <div className={`meter__bar meter__bar--${t}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
