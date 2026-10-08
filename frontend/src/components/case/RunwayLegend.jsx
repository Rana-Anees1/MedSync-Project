export default function RunwayLegend() {
  return (
    <div className="legend" aria-label="Timeline legend">
      <span><i className="legend__dot legend__dot--ok" /> Done</span>
      <span><i className="legend__dot legend__dot--warn" /> Awaiting check</span>
      <span><i className="legend__dot legend__dot--neutral" /> Pending</span>
      <span><i className="legend__dot legend__dot--bad" /> Overdue</span>
      <span><i className="legend__line" /> Today</span>
      <span><i className="legend__diamond" /> Surgery</span>
    </div>
  );
}
