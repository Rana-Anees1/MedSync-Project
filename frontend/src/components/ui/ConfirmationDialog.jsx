import Modal from './Modal';
import Button from './Button';

export default function ConfirmationDialog({ open, title, children, confirmLabel = 'Confirm', tone = 'primary', busy = false, onConfirm, onCancel }) {
  return (
    <Modal open={open} title={title} onClose={onCancel} footer={<><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button variant={tone} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button></>}>
      {children}
    </Modal>
  );
}
