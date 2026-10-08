import { useState } from 'react';
import { Search } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatDate } from '../../utils/date';
import { PageHeader, Panel, EmptyState } from '../../components/ui';

export default function AuditPage() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const rows = state.audit.filter((a) => !q || `${a.actor} ${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Audit log">Every change to cases, users, templates and rules, newest first.</PageHeader>
      <Panel flush>
        <div className="toolbar">
          <label className="search">
            <Search size={16} aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by person, action or patient" aria-label="Search audit log" />
          </label>
        </div>
        {rows.length === 0 ? <EmptyState title="No entries match" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Who</th><th>Action</th><th>Record</th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}><td>{formatDate(a.date)}</td><td>{a.actor}</td><td>{a.action}</td><td>{a.target || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
