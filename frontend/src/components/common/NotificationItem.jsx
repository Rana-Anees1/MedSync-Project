import { AlertTriangle, BellRing, Siren, TrendingUp, Info } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { relativeDay } from '../../utils/date';

const KIND = {
  escalation: { icon: AlertTriangle, tone: 'bad' },
  risk: { icon: TrendingUp, tone: 'warn' },
  alert: { icon: Siren, tone: 'bad' },
  reminder: { icon: BellRing, tone: 'info' },
  info: { icon: Info, tone: 'neutral' },
};

export default function NotificationItem({ n, onClick }) {
  const { state } = useStore();
  const k = KIND[n.kind] || KIND.info;
  const Icon = k.icon;
  return (
    <button className={`notif ${n.read ? '' : 'notif--unread'}`} onClick={onClick}>
      <span className={`notif__icon notif__icon--${k.tone}`}><Icon size={16} aria-hidden /></span>
      <span className="notif__text">
        <strong>{n.title}</strong>
        {n.body && <span>{n.body}</span>}
        <small>{relativeDay(n.date, state.sim.today)}</small>
      </span>
    </button>
  );
}
