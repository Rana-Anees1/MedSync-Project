/**
 * Small SVG line chart for recovery trends.
 * series: [{ label, values: number[], tone }], labels: string[], threshold?: number
 */
export default function LineChart({ series, labels, threshold, height = 220, yMax }) {
  const W = 900;
  const H = height;
  const pad = { l: 34, r: 40, t: 16, b: 28 };
  const all = series.flatMap((s) => s.values);
  const max = yMax ?? Math.max(threshold ?? 0, ...all, 1) + 1;
  const n = Math.max(labels.length, 2);
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / (n - 1);
  const y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const ticks = [0, Math.round(max / 2), Math.round(max)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="linechart" role="img" aria-label={series.map((s) => s.label).join(', ')}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="linechart__grid" />
          <text x={pad.l - 8} y={y(t) + 4} className="linechart__tick" textAnchor="end">{t}</text>
        </g>
      ))}
      {threshold != null && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(threshold)} y2={y(threshold)} className="linechart__threshold" />
          <text x={W - pad.r} y={y(threshold) - 5} textAnchor="end" className="linechart__thlabel">Alert threshold</text>
        </g>
      )}
      {series.map((s) => (
        <g key={s.label} className={`linechart__series linechart__series--${s.tone || 'brand'}`}>
          <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
          {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={4} />)}
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="linechart__tick">{l}</text>
      ))}
    </svg>
  );
}
