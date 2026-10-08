import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useActions } from '../../context/hooks';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROLE_LABELS } from '../../config/constants';
import { PageHeader, Panel, Button, Modal, Field, Input, Select, Pill, Avatar } from '../../components/ui';

const EMPTY = { name: '', email: '', role: 'coordinator', title: '', password: '', patientId: '' };

export default function UsersPage() {
  const { state } = useStore();
  const { user: me } = useAuth();
  const actions = useActions();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pending = state.users.filter((u) => u.approval === 'pending');
  const rest = state.users.filter((u) => u.approval !== 'pending');

  const save = async () => {
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a name and a valid e-mail address.');
    if (form.password.length < 8 || !/\d/.test(form.password) || !/[A-Za-z]/.test(form.password)) return setError('Temporary password: at least 8 characters with letters and numbers.');
    setBusy(true);
    const ok = await actions.addUser({ ...form, title: form.title || ROLE_LABELS[form.role] });
    setBusy(false);
    if (ok) { toast(`${form.name} added as ${ROLE_LABELS[form.role]}. Share the temporary password securely.`); setForm(EMPTY); setError(''); setOpen(false); }
  };

  const row = (u) => (
    <tr key={u.id}>
      <td><span className="user-cell"><Avatar name={u.name} size={30} tone={u.role === 'patient' ? 'warm' : 'brand'} /><span><strong className="cell-title">{u.name}</strong><span className="cell-sub">{u.title}</span></span></span></td>
      <td>{ROLE_LABELS[u.role]}</td>
      <td>{u.email}</td>
      <td>{u.approval === 'pending' ? <Pill tone="warn">Awaiting approval</Pill> : <Pill tone={u.active ? 'ok' : 'neutral'}>{u.active ? 'Active' : 'Deactivated'}</Pill>}</td>
      <td className="table__actions">
        {u.approval === 'pending' ? (
          <Button size="sm" onClick={() => actions.approveUser(u.id).then((ok) => ok && toast(`${u.name} can now sign in.`))}>Approve</Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={u.id === me.id} onClick={() => actions.toggleUser(u.id, !u.active).then((ok) => ok && toast(`${u.name} ${u.active ? 'deactivated' : 'activated'}.`, 'info'))}>{u.active ? 'Deactivate' : 'Activate'}</Button>
        )}
      </td>
    </tr>
  );
  const linkable = state.patients || [];

  return (
    <>
      <PageHeader title="Users & roles" actions={<Button icon={UserPlus} onClick={() => setOpen(true)}>Add user</Button>}>
        Each role sees only its own screens; the API enforces the same permissions. Staff who sign up appear here for approval.
      </PageHeader>
      <Panel flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{pending.map(row)}{rest.map(row)}</tbody>
          </table>
        </div>
      </Panel>
      <Modal open={open} title="Add user" onClose={() => setOpen(false)} footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Add user'}</Button></>}>
        <div className="form-grid">
          <Field label="Full name" className="span-2">{(id) => <Input id={id} value={form.name} onChange={set('name')} placeholder="Dr. Ahmed Raza" />}</Field>
          <Field label="Email">{(id) => <Input id={id} type="email" value={form.email} onChange={set('email')} />}</Field>
          <Field label="Role">{(id) => <Select id={id} value={form.role} onChange={set('role')} options={Object.entries(ROLE_LABELS).filter(([r]) => r !== 'patient' || linkable.length).map(([value, label]) => ({ value, label }))} />}</Field>
          <Field label="Job title">{(id) => <Input id={id} value={form.title} onChange={set('title')} placeholder="e.g. Registrar, General Surgery" />}</Field>
          <Field label="Temporary password" hint="At least 8 characters with letters and numbers">{(id) => <Input id={id} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />}</Field>
          {error && <p className="field__error span-2">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
