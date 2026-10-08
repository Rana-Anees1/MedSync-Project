import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useActions, useMyNotifications } from '../../context/hooks';
import { useAuth } from '../../context/AuthContext';
import NotificationItem from '../common/NotificationItem';

export default function NotificationBell() {
  const list = useMyNotifications();
  const unread = list.filter((n) => !n.read);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const actions = useActions();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = (n) => {
    actions.markRead(n.id);
    setOpen(false);
    if (n.caseId) navigate(user.role === 'patient' ? '/my' : `/cases/${n.caseId}`);
  };

  return (
    <div className="bell" ref={ref}>
      <button className="icon-btn bell__btn" onClick={() => setOpen((o) => !o)} aria-label={`Notifications, ${unread.length} unread`} aria-expanded={open}>
        <Bell size={20} />
        {unread.length > 0 && <span className="bell__count">{unread.length}</span>}
      </button>
      {open && (
        <div className="bell__menu" role="menu">
          <div className="bell__head">
            <strong>Notifications</strong>
            {unread.length > 0 && (
              <button className="link-btn" onClick={() => actions.markAllRead()}>Mark all as read</button>
            )}
          </div>
          <div className="bell__list">
            {list.length === 0 && <p className="muted bell__empty">Nothing new. Reminders and alerts will appear here.</p>}
            {list.slice(0, 8).map((n) => (
              <NotificationItem key={n.id} n={n} onClick={() => openItem(n)} />
            ))}
          </div>
          <Link to="/notifications" className="bell__all" onClick={() => setOpen(false)}>See all notifications</Link>
        </div>
      )}
    </div>
  );
}
