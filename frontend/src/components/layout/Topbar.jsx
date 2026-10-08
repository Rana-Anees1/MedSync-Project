import { Menu, CalendarDays } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useStore } from '../../context/StoreContext';
import { HOSPITAL } from '../../config/constants';
import { formatLong } from '../../utils/date';

export default function Topbar({ onMenu }) {
  const { state } = useStore();
  return (
    <header className="topbar">
      <button className="icon-btn topbar__menu" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
      <span className="topbar__org">{HOSPITAL.name} · {HOSPITAL.department}</span>
      <div className="topbar__right">
        <span className="topbar__date"><CalendarDays size={16} aria-hidden /> {formatLong(state.sim.today)}</span>
        <NotificationBell />
      </div>
    </header>
  );
}
