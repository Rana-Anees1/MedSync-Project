import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useActions } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { OWNER_LABELS } from '../../config/constants';
import { addDays } from '../../utils/date';
import { Modal, Button, Field, Input, Select, Textarea, Check } from '../ui';

/** Add a custom readiness task to the procedure's plan. */
export function AddTaskModal({ c, onClose }) {
  const { state } = useStore();
  const actions = useActions();
  const { toast } = useToast();
  const today = state.sim.today;
  const [f, setF] = useState({ title: '', description: '', owner: 'patient', deadline: c.surgeryDate > addDays(today, 1) ? addDays(c.surgeryDate, -1) : c.surgeryDate, priority: 'medium', mandatory: true });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    if (!f.title.trim()) return setErr('Enter the task');
    const ok = await actions.addItem(c.id, f);
    if (ok) { toast(`Task added: ${f.title}`); onClose(); }
  };
  return (
    <Modal open title="Add readiness task" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Add task</Button></>}>
      <div className="form-grid">
        <Field label="Task" error={err} className="span-2">{(id) => <Input id={id} value={f.title} onChange={set('title')} placeholder="e.g. Chest X-ray" />}</Field>
        <Field label="Description" className="span-2">{(id) => <Textarea id={id} value={f.description} onChange={set('description')} />}</Field>
        <Field label="Responsible">{(id) => <Select id={id} value={f.owner} onChange={set('owner')} options={Object.entries(OWNER_LABELS).map(([value, label]) => ({ value, label }))} />}</Field>
        <Field label="Priority">{(id) => <Select id={id} value={f.priority} onChange={set('priority')} options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />}</Field>
        <Field label="Deadline" hint="Between today and the surgery date">{(id) => <Input id={id} type="date" min={today} max={c.surgeryDate} value={f.deadline} onChange={set('deadline')} />}</Field>
        <div className="field"><span className="field__label">Required for clearance</span><Check label="Required" checked={f.mandatory} onChange={(e) => setF((x) => ({ ...x, mandatory: e.target.checked }))} /></div>
      </div>
    </Modal>
  );
}

/** Change the planned surgery date and responsible staff. */
export function EditCaseModal({ c, onClose }) {
  const { state } = useStore();
  const actions = useActions();
  const { toast } = useToast();
  const staff = (role) => state.users.filter((u) => u.role === role && u.active).map((u) => ({ value: u.id, label: u.name }));
  const dateEditable = ['LISTED', 'PREPARATION', 'READY'].includes(c.status);
  const [f, setF] = useState({ surgeryDate: c.surgeryDate, surgeonId: c.surgeonId || '', anaesthetistId: c.anaesthetistId || '', coordinatorId: c.coordinatorId || '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    const ok = await actions.updateCase(c.id, { ...f, surgeryDate: dateEditable ? f.surgeryDate : undefined, anaesthetistId: f.anaesthetistId || undefined, coordinatorId: f.coordinatorId || undefined });
    if (ok) { toast('Procedure updated. Affected staff and the patient were notified.'); onClose(); }
  };
  return (
    <Modal open title="Edit procedure" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save changes</Button></>}>
      <div className="form-grid">
        <Field label="Planned surgery date" hint={dateEditable ? 'Open tasks are re-scheduled to the new date' : 'Date is fixed once the case is scheduled'}>{(id) => <Input id={id} type="date" min={addDays(state.sim.today, 1)} value={f.surgeryDate} disabled={!dateEditable} onChange={set('surgeryDate')} />}</Field>
        <Field label="Responsible surgeon">{(id) => <Select id={id} value={f.surgeonId} onChange={set('surgeonId')} options={staff('surgeon')} />}</Field>
        <Field label="Anaesthetist">{(id) => <Select id={id} value={f.anaesthetistId} onChange={set('anaesthetistId')} placeholder="Not assigned" options={staff('anaesthetist')} />}</Field>
        <Field label="Pre-op coordinator">{(id) => <Select id={id} value={f.coordinatorId} onChange={set('coordinatorId')} placeholder="Not assigned" options={staff('coordinator')} />}</Field>
      </div>
    </Modal>
  );
}
