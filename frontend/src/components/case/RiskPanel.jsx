import { ArrowUpRight, ArrowDownRight, Cpu } from 'lucide-react';
import Panel from '../ui/Panel';
import RiskBadge from '../ui/RiskBadge';

/** Explains the AI prediction: what drives it and what to do about it. */
export default function RiskPanel({ risk, title = 'Cancellation risk', emptyText = 'Risk is calculated while the case is being prepared for surgery.' }) {
  return (
    <Panel title={title} actions={risk && <RiskBadge risk={risk} size="lg" />}>
      {!risk ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <>
          <p className="muted small">Main factors behind this prediction</p>
          <ul className="factors">
            {risk.factors.map((f) => (
              <li key={f.label} className={`factor factor--${f.direction}`}>
                {f.direction === 'up' ? <ArrowUpRight size={16} aria-hidden /> : <ArrowDownRight size={16} aria-hidden />}
                <span>{f.label}</span>
                <span className="factor__bar" style={{ width: `${Math.min(100, Math.abs(f.impact) * 40)}px` }} aria-hidden />
              </li>
            ))}
            {risk.factors.length === 0 && <li className="muted">No risk factors found.</li>}
          </ul>
          <p className="model-note">
            <Cpu size={14} aria-hidden /> {risk.model.name} · {risk.model.version}. Prototype estimate; the trained model replaces it in the AI phase.
          </p>
        </>
      )}
    </Panel>
  );
}
