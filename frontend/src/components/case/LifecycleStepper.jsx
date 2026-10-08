import { Check } from 'lucide-react';
import { LIFECYCLE, CASE_STATUS } from '../../config/constants';

export default function LifecycleStepper({ status }) {
  const side = status === 'DEFERRED' || status === 'CANCELLED';
  const idx = LIFECYCLE.indexOf(status);
  return (
    <ol className="stepper" aria-label="Case progress">
      {LIFECYCLE.map((s, i) => {
        const state = side ? (i <= 1 ? 'completed' : 'todo') : i < idx ? 'completed' : i === idx ? 'current' : 'todo';
        return (
          <li key={s} className={`stepper__step stepper__step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="stepper__dot">{state === 'completed' ? <Check size={12} /> : i + 1}</span>
            <span className="stepper__label">{CASE_STATUS[s].label}</span>
          </li>
        );
      })}
      {side && (
        <li className="stepper__step stepper__step--side">
          <span className="stepper__dot">!</span>
          <span className="stepper__label">{CASE_STATUS[status].label}</span>
        </li>
      )}
    </ol>
  );
}
