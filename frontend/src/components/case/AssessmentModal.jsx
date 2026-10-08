import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';

const ASA = ['ASA I', 'ASA II', 'ASA III', 'ASA IV'];

export default function AssessmentModal({ open, c, onClose, onSave }) {
  const a = c.assessment || {};
  const [form, setForm] = useState({
    asa: a.asa || 'ASA II',
    airway: a.airway || 'Mallampati II',
    fasting: a.fasting || 'Nothing to eat after midnight. Clear water allowed until 6 am.',
    medicineHolds: a.medicineHolds || '',
    abnormal: (c.labs?.abnormal || []).join(', '),
    notes: a.notes || '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal
      open={open}
      title="Pre-anaesthesia assessment"
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save assessment</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="ASA grade">{(id) => <Select id={id} value={form.asa} onChange={set('asa')} options={ASA} />}</Field>
        <Field label="Airway">{(id) => <Input id={id} value={form.airway} onChange={set('airway')} />}</Field>
        <Field label="Fasting instructions for the patient" className="span-2" hint="Sent to the patient's app as written">
          {(id) => <Textarea id={id} value={form.fasting} onChange={set('fasting')} />}
        </Field>
        <Field label="Medicines to hold or continue" className="span-2" hint="e.g. Stop aspirin 5 days before. Take amlodipine with a sip of water.">
          {(id) => <Textarea id={id} value={form.medicineHolds} onChange={set('medicineHolds')} />}
        </Field>
        <Field label="Abnormal results (comma separated)" className="span-2" hint="Used by the cancellation-risk model">
          {(id) => <Input id={id} value={form.abnormal} onChange={set('abnormal')} />}
        </Field>
        <Field label="Clinical notes" className="span-2">{(id) => <Textarea id={id} value={form.notes} onChange={set('notes')} />}</Field>
      </div>
    </Modal>
  );
}
