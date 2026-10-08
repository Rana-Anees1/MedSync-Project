import { CASE_STATUS, ITEM_STATUS, ALERT_STATUS } from '../../config/constants';

export function Pill({ tone = 'neutral', children, dot = true }) {
  return (
    <span className={`pill pill--${tone}`}>
      {dot && <span className="pill__dot" aria-hidden />}
      {children}
    </span>
  );
}

export const StatusPill = ({ status }) => <Pill tone={CASE_STATUS[status]?.tone}>{CASE_STATUS[status]?.label || status}</Pill>;
export const ItemStatusPill = ({ status }) => <Pill tone={ITEM_STATUS[status]?.tone}>{ITEM_STATUS[status]?.label || status}</Pill>;
export const AlertStatusPill = ({ status }) => <Pill tone={ALERT_STATUS[status]?.tone}>{ALERT_STATUS[status]?.label || status}</Pill>;
