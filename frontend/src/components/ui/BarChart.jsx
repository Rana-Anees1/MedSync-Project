/** Horizontal bar chart (no chart library needed). data: [{ label, value, tone? }] */
export default function BarChart({ data, unit = '', max }) {
  const top = max || Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="bars">
      {data.map((d) => (
        <li key={d.label} className="bars__row">
          <span className="bars__label">{d.label}</span>
          <span className="bars__track">
            <span className={`bars__fill bars__fill--${d.tone || 'brand'}`} style={{ width: `${(d.value / top) * 100}%` }} />
          </span>
          <span className="bars__value">{d.value}{unit}</span>
        </li>
      ))}
    </ul>
  );
}
