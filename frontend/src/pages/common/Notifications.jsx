import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff } from 'lucide-react';
import { useActions, useMyNotifications } from '../../context/hooks';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Panel, Tabs, Button, EmptyState } from '../../components/ui';
import NotificationItem from '../../components/common/NotificationItem';

export default function Notifications() {
  const list = useMyNotifications();
  const actions = useActions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const shown = tab === 'unread' ? list.filter((n) => !n.read) : list;

  return (
    <>
      <PageHeader title="Notifications" actions={<Button variant="secondary" onClick={() => actions.markAllRead()} disabled={!list.some((n) => !n.read)}>Mark all as read</Button>}>
        Reminders, escalations and alerts that MedSync sent you.
      </PageHeader>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: list.length }, { value: 'unread', label: 'Unread', count: list.filter((n) => !n.read).length }]} />
      <Panel flush>
        {shown.length === 0 ? <EmptyState icon={BellOff} title="You're up to date">New reminders and alerts will appear here.</EmptyState> : (
          <div className="notif-page">
            {shown.map((n) => (
              <NotificationItem key={n.id} n={n} onClick={() => { actions.markRead(n.id); if (n.caseId) navigate(user.role === 'patient' ? '/my' : `/cases/${n.caseId}`); }} />
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
