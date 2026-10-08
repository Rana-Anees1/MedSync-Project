import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { useActions, useEnrichedCases, useLookup } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { diffDays, formatDate, countdown } from '../../utils/date';
import { isPreop } from '../../services/workflow';
import { OWNER_LABELS } from '../../config/constants';
import { PageHeader, Panel, Tabs, Select, ItemStatusPill, Button, EmptyState } from '../../components/ui';

export default function ReadinessTasks() {
  const { today } = useLookup();
  const actions = useActions();
  const { toast } = useToast();
  const cases = useEnrichedCases().filter(isPreop);
  const [tab, setTab] = useState('overdue');
  const [owner, setOwner] = useState('');

  const all = useMemo(
    () => cases.flatMap((c) => c.items.filter((it) => !['completed', 'not_required'].includes(it.status)).map((it) => ({ it, c }))),
    [cases]
  );
  const filtered = all
    .filter(({ it }) => (tab === 'all' ? true : it.status === tab))
    .filter(({ it }) => !owner || it.owner === owner)
    .sort((a, b) => diffDays(a.it.deadline, b.it.deadline));
  const count = (s) => all.filter(({ it }) => it.status === s).length;

  return (
    <>
      <PageHeader title="Readiness tasks">Every open readiness item across all upcoming operations, earliest deadline first.</PageHeader>
      <Panel flush>
        <div className="toolbar">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'overdue', label: 'Overdue', count: count('overdue') },
            { value: 'in_progress', label: 'Awaiting check', count: count('in_progress') },
            { value: 'pending', label: 'Pending', count: count('pending') },
            { value: 'all', label: 'All open', count: all.length },
          ]} />
          <div className="toolbar__filters">
            <Select aria-label="Responsible" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Anyone responsible" options={Object.entries(OWNER_LABELS).map(([value, label]) => ({ value, label }))} />
          </div>
        </div>
        {filtered.length === 0 ? <EmptyState icon={ListChecks} title="Nothing here">No open items match this view.</EmptyState> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Item</th><th>Patient</th><th>Responsible</th><th>Due</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {filtered.map(({ it, c }) => {
                  const left = diffDays(it.deadline, today);
                  return (
                    <tr key={it.id} className={it.status === 'overdue' ? 'row--bad' : ''}>
                      <td><strong className="cell-title">{it.title}</strong>{it.note && <span className="cell-sub">{it.note}</span>}</td>
                      <td><Link className="link" to={`/cases/${c.id}`}>{c.patient.name}</Link><span className="cell-sub">Surgery {formatDate(c.surgeryDate)} · {countdown(c.surgeryDate, today)}</span></td>
                      <td>{OWNER_LABELS[it.owner]}</td>
                      <td>{formatDate(it.deadline)}<span className={`cell-sub ${left < 0 ? 'cell-sub--bad' : ''}`}>{left < 0 ? `${-left} day(s) late` : left === 0 ? 'Due today' : `In ${left} day(s)`}</span></td>
                      <td><ItemStatusPill status={it.status} /></td>
                      <td className="table__actions">
                        {it.status === 'in_progress' && <Button size="sm" onClick={() => { actions.completeItem(c.id, it.id).then((ok) => ok && toast(`Verified: ${it.title}`)); }}>Verify</Button>}
                        {it.status !== 'in_progress' && ['patient', 'coordinator'].includes(it.owner) && (
                          <Button size="sm" variant="secondary" onClick={() => { actions.completeItem(c.id, it.id).then((ok) => ok && toast(`Marked done: ${it.title}`)); }}>Mark done</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
