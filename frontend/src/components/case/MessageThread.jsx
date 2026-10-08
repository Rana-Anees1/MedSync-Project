import { useState } from 'react';
import { Send } from 'lucide-react';
import { useLookup, useActions } from '../../context/hooks';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/date';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';

export default function MessageThread({ c, placeholder = 'Write a message to the patient' }) {
  const { user: me } = useAuth();
  const { user } = useLookup();
  const actions = useActions();
  const [text, setText] = useState('');

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    actions.sendMessage(c.id, text.trim());
    setText('');
  };

  return (
    <div className="thread">
      <div className="thread__list">
        {c.messages.length === 0 && <EmptyState title="No messages yet">Instructions and advice sent here also appear in the patient's app.</EmptyState>}
        {c.messages.map((m) => {
          const from = user(m.from);
          const mine = m.from === me.id;
          return (
            <div key={m.id} className={`msg ${mine ? 'msg--mine' : ''}`}>
              <div className="msg__meta">{from?.name || 'Patient'} · {formatDate(m.date)}</div>
              <div className="msg__bubble">{m.text}</div>
            </div>
          );
        })}
      </div>
      <form className="thread__form" onSubmit={send}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label="Message" />
        <Button type="submit" icon={Send} disabled={!text.trim()}>Send</Button>
      </form>
    </div>
  );
}
