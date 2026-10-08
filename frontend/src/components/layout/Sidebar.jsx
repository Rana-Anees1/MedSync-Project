import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV } from '../../config/navigation';
import { HOSPITAL, ROLE_LABELS } from '../../config/constants';
import { useMyNotifications } from '../../context/hooks';
import Avatar from '../ui/Avatar';
import Logo from './Logo';

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const unread = useMyNotifications().filter((n) => !n.read).length;
  const items = NAV[user.role] || [];

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar__brand">
        <Logo />
        <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>
      <p className="sidebar__org">{HOSPITAL.department}</p>
      <nav className="sidebar__nav">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/my' || to === '/admin'} className={({ isActive }) => `navlink ${isActive ? 'navlink--active' : ''}`}>
            <Icon size={18} aria-hidden />
            <span>{label}</span>
            {to === '/notifications' && unread > 0 && <span className="navlink__badge">{unread}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__user">
        <Avatar name={user.name} size={34} tone="light" />
        <div className="sidebar__who">
          <strong>{user.name}</strong>
          <span>{ROLE_LABELS[user.role]}</span>
        </div>
        <button className="icon-btn icon-btn--light" onClick={logout} aria-label="Sign out" title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
