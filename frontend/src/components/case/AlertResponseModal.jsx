import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Textarea } from '../ui/Field';

const QUICK = {
  advised: [
    'Keep the wound clean and dry. Take paracetamol 1 g up to three times a day and check in again tomorrow.',
    'Mild redness is common. Watch it today and send a photo with tomorrow\'s check-in.',
  ],
  recalled: [
    'Please come to the surgical OPD tomorrow at 9 am so we can examine your wound.',
    'Please come to the surgical OPD today. Bring your discharge papers.',
  ],
  resolved: ['Reviewed. No action needed.'],
};

export default function AlertResponseModal({ alert, patientName, onClose, onRespond }) {
  const [status, setStatus] = useState('advised');
  const [text, setText] = useState('');
  if (!alert) return null;
  return (
    <Modal
      open
      title={`Respond to alert for ${patientName}`}
      onClose={onClose}
      width={600}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onRespond(status, text.trim())} disabled={status !== 'resolved' && !text.trim()}>
            {status === 'advised' ? 'Send advice' : status === 'recalled' ? 'Recall patient' : 'Resolve alert'}
          </Button>
        </>
      }
    >
      <p className="callout callout--bad">{alert.message}</p>
      <div className="segmented" role="radiogroup" aria-label="Response">
        {[
          ['advised', 'Send advice'],
          ['recalled', 'Recall for review'],
          ['resolved', 'Resolve, no action'],
        ].map(([v, l]) => (
          <button key={v} role="radio" aria-checked={status === v} className={`segmented__opt ${status === v ? 'is-on' : ''}`} onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>
      <Field label={status === 'resolved' ? 'Note (optional)' : 'Message to the patient'} hint="Appears in the patient's app">
        {(id) => <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} rows={4} />}
      </Field>
      <div className="quick">
        {QUICK[status].map((q) => (
          <button key={q} className="chip" onClick={() => setText(q)}>{q}</button>
        ))}
      </div>
    </Modal>
  );
}
