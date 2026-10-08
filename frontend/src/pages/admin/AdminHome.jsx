import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useActions } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { ROLE_LABELS } from '../../config/constants';
import { formatDate } from '../../utils/date';
import { Panel, Stat, BarChart, Button, ConfirmationDialog } from '../../components/ui';
import { IMAGES } from '../../assets/images';

export default function AdminHome() {
  const { state } = useStore();
  const actions = useActions();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const approved = state.users.filter((u) => u.approval !== 'pending');
  const pending = state.users.filter((u) => u.approval === 'pending');
  const byRole = Object.keys(ROLE_LABELS).map((r) => ({ label: ROLE_LABELS[r], value: approved.filter((u) => u.role === r && u.active).length }));
  const open = state.cases.filter((c) => !['RECOVERED', 'CANCELLED'].includes(c.status)).length;

  const run = async () => {
    setBusy(true);
    const res = await actions.runDailyChecks();
    setBusy(false); setConfirm(false);
    if (res) toast(`Daily checks completed: ${res.checked} cases checked, ${res.events} reminders or escalations sent.`, 'info');
  };

  return (
    <>
      <div className="hero-banner">
        <img src={IMAGES.hospitalBuilding} alt="" />
        <div>
          <h1>Administration</h1>
          <p>Users, procedure templates and the rules MedSync uses to remind, escalate and alert.</p>
        </div>
        <Button icon={PlayCircle} onClick={() => setConfirm(true)}>Run daily checks now</Button>
      </div>
      <div className="stats">
        <Stat label="Active users" value={approved.filter((u) => u.active).length} to="/admin/users" />
        <Stat label="Accounts awaiting approval" value={pending.length} tone={pending.length ? 'warn' : 'ok'} to="/admin/users" />
        <Stat label="Procedure templates" value={state.templates.length} to="/admin/templates" />
        <Stat label="Open procedures" value={open} />
      </div>
      <div className="grid grid--2">
        <Panel title="Active users by role" actions={<Link className="link" to="/admin/users">Manage users</Link>}><BarChart data={byRole} /></Panel>
        <Panel title="Recent activity" actions={<Link className="link" to="/admin/audit">Full audit log</Link>} flush>
          <ul className="audit-mini">
            {state.audit.slice(0, 8).map((a) => (
              <li key={a.id}><time>{formatDate(a.date)}</time><span><strong>{a.actor}</strong> {a.action.toLowerCase()}{a.target ? `: ${a.target}` : ''}</span></li>
            ))}
          </ul>
        </Panel>
      </div>
      <ConfirmationDialog open={confirm} title="Run daily checks now?" confirmLabel="Run checks" busy={busy} onConfirm={run} onCancel={() => setConfirm(false)}>
        <p>MedSync normally runs these checks automatically every morning. Running them now marks overdue tasks, escalates them, sends due reminders and recalculates readiness risk. Checks are safe to repeat: notifications already sent today are not duplicated.</p>
      </ConfirmationDialog>
    </>
  );
}
