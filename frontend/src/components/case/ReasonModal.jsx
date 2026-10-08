import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Textarea } from '../ui/Field';

export default function ReasonModal({ open, title, label, confirmLabel, onClose, onConfirm, tone = 'primary' }) {
  const [reason, setReason] = useState('');
  const submit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
  };
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={tone} onClick={submit} disabled={!reason.trim()}>{confirmLabel}</Button>
        </>
      }
    >
      <Field label={label}>{(id) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
    </Modal>
  );
}
