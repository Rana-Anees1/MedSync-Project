import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useActions, useLookup } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { OWNER_LABELS, PRIORITY } from '../../config/constants';
import { openProtectedFile } from '../../services/api';
import { formatDate, diffDays } from '../../utils/date';
import { isPreop } from '../../services/workflow';
import { ItemStatusPill, Pill } from '../ui/Pill';
import Button from '../ui/Button';
import ReasonModal from './ReasonModal';

/** Readiness items with the action each role can take on them. */
export default function ReadinessChecklist({ c, onAssess }) {
  const { user } = useAuth();
  const { today, user: findUser } = useLookup();
  const actions = useActions();
  const { toast } = useToast();
  const [modal, setModal] = useState(null); // { type: 'return'|'waive', item }
  const editable = isPreop(c);

  const actionsFor = (it) => {
    if (!editable || it.status === 'completed' || it.status === 'not_required') return null;
    const role = user.role;
    if (role === 'coordinator') {
      if (it.status === 'in_progress')
        return (
          <>
            <Button size="sm" onClick={() => { actions.completeItem(c.id, it.id).then((ok) => ok && toast(`Verified: ${it.title}`)); }}>Verify</Button>
            <Button size="sm" variant="ghost" onClick={() => setModal({ type: 'return', item: it })}>Return</Button>
          </>
        );
      if (['patient', 'coordinator'].includes(it.owner))
        return (
          <>
            <Button size="sm" variant="secondary" onClick={() => { actions.completeItem(c.id, it.id).then((ok) => ok && toast(`Marked done: ${it.title}`)); }}>Mark done</Button>
            {!it.dayOf && <Button size="sm" variant="ghost" onClick={() => setModal({ type: 'waive', item: it })}>Not needed</Button>}
          </>
        );
    }
    if (role === 'surgeon' && it.owner === 'surgeon')
      return <Button size="sm" variant="secondary" onClick={() => { actions.completeItem(c.id, it.id).then((ok) => ok && toast(`Recorded: ${it.title}`)); }}>Mark signed</Button>;
    if (role === 'anaesthetist' && it.key === 'anaesth')
      return <Button size="sm" onClick={onAssess}>Assess patient</Button>;
    return null;
  };

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Readiness item</th>
              <th>Responsible</th>
              <th>Due</th>
              <th>Status</th>
              <th className="table__actions-col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {c.items.map((it) => {
              const left = diffDays(it.deadline, today);
              return (
                <tr key={it.id} className={it.status === 'overdue' ? 'row--bad' : it.priority === 'high' && it.status === 'pending' ? 'row--priority' : ''}>
                  <td>
                    <strong className="cell-title">{it.title} {it.priority === 'high' && !['completed', 'not_required'].includes(it.status) && <Pill tone={PRIORITY.high.tone}>High priority</Pill>}</strong>
                    {it.description && <span className="cell-sub">{it.description}</span>}
                    {it.attachment && <button className="link-btn small" onClick={() => openProtectedFile(it.attachment.url).catch((e) => toast(e.message, 'warning'))}>View {it.attachment.fileName}</button>}
                    {it.reason && <span className="cell-sub">{it.reason}</span>}
                    {it.note && <span className="cell-sub">{it.note}</span>}
                    {it.escalationLevel > 0 && it.status === 'overdue' && (
                      <span className="cell-sub cell-sub--bad">Escalated to {it.escalationLevel === 2 ? 'surgeon' : 'pre-op coordinator'}</span>
                    )}
                  </td>
                  <td>{OWNER_LABELS[it.owner]}{!it.mandatory && <span className="cell-sub">Optional</span>}</td>
                  <td>
                    {formatDate(it.deadline)}
                    {['pending', 'overdue', 'in_progress'].includes(it.status) && (
                      <span className={`cell-sub ${left < 0 ? 'cell-sub--bad' : ''}`}>
                        {left < 0 ? `${-left} day${left === -1 ? '' : 's'} late` : left === 0 ? 'Due today' : `In ${left} day${left === 1 ? '' : 's'}`}
                      </span>
                    )}
                  </td>
                  <td>
                    <ItemStatusPill status={it.status} />
                    {it.completedOn && it.status === 'completed' && (
                      <span className="cell-sub">{formatDate(it.completedOn)}{it.completedBy ? ` · ${findUser(it.completedBy)?.name || ''}` : ''}</span>
                    )}
                  </td>
                  <td className="table__actions">{actionsFor(it)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ReasonModal
        open={modal?.type === 'return'}
        title={`Return "${modal?.item?.title}" to the patient`}
        label="What needs to be fixed?"
        confirmLabel="Return to patient"
        onClose={() => setModal(null)}
        onConfirm={(r) => { actions.returnItem(c.id, modal.item.id, r).then((ok) => ok && toast('Returned to the patient with your note.', 'info')); setModal(null); }}
      />
      <ReasonModal
        open={modal?.type === 'waive'}
        title={`Mark "${modal?.item?.title}" as not needed`}
        label="Reason (recorded in the audit log)"
        confirmLabel="Mark not needed"
        onClose={() => setModal(null)}
        onConfirm={(r) => { actions.waiveItem(c.id, modal.item.id, r).then((ok) => ok && toast('Item marked as not needed.', 'info')); setModal(null); }}
      />
    </>
  );
}
