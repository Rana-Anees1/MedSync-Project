import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useEnrichedCases, useLookup } from '../../context/hooks';
import { useStore } from '../../context/StoreContext';
import { diffDays } from '../../utils/date';
import { isPreop } from '../../services/workflow';
import { PageHeader, Panel, Tabs, Select, EmptyState } from '../../components/ui';
import CaseTable from '../../components/case/CaseTable';
import RunwayLegend from '../../components/case/RunwayLegend';

export default function ReadinessBoard() {
  const { state } = useStore();
  const { today } = useLookup();
  const all = useEnrichedCases();
  const [view, setView] = useState('preop');
  const [q, setQ] = useState('');
  const [risk, setRisk] = useState('');
  const [surgeon, setSurgeon] = useState('');

  const groups = {
    preop: all.filter(isPreop),
    recovery: all.filter((c) => ['COMPLETED', 'DISCHARGED', 'RECOVERY'].includes(c.status)),
    closed: all.filter((c) => ['RECOVERED', 'CANCELLED', 'DEFERRED'].includes(c.status)),
  };

  const rows = useMemo(
    () =>
      groups[view]
        .filter((c) => !q || `${c.patient.name} ${c.patient.mrn} ${c.procedureName}`.toLowerCase().includes(q.toLowerCase()))
        .filter((c) => !risk || c.risk?.level === risk)
        .filter((c) => !surgeon || c.surgeonId === surgeon)
        .sort((a, b) => (view === 'preop' ? diffDays(a.surgeryDate, b.surgeryDate) : diffDays(b.surgeryDate, a.surgeryDate))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, view, q, risk, surgeon]
  );

  const surgeons = state.users.filter((u) => u.role === 'surgeon').map((u) => ({ value: u.id, label: u.name }));
  const high = groups.preop.filter((c) => c.risk?.level === 'high').length;
  const soon = groups.preop.filter((c) => diffDays(c.surgeryDate, today) <= 2).length;

  return (
    <>
      <PageHeader title="Readiness board">
        Every elective case from listing to the operating day. {high} at high risk of cancellation, {soon} within 2 days of surgery.
      </PageHeader>
      <Panel flush>
        <div className="toolbar">
          <Tabs
            value={view}
            onChange={setView}
            tabs={[
              { value: 'preop', label: 'Preparing for surgery', count: groups.preop.length },
              { value: 'recovery', label: 'Operated & recovering', count: groups.recovery.length },
              { value: 'closed', label: 'Closed, deferred & cancelled', count: groups.closed.length },
            ]}
          />
          <div className="toolbar__filters">
            <label className="search">
              <Search size={16} aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, MRN or procedure" aria-label="Search cases" />
            </label>
            {view === 'preop' && (
              <Select aria-label="Filter by risk" value={risk} onChange={(e) => setRisk(e.target.value)} placeholder="Any risk" options={[{ value: 'high', label: 'High risk' }, { value: 'medium', label: 'Watch' }, { value: 'low', label: 'On track' }]} />
            )}
            <Select aria-label="Filter by surgeon" value={surgeon} onChange={(e) => setSurgeon(e.target.value)} placeholder="All surgeons" options={surgeons} />
          </div>
        </div>
        {view === 'preop' && <RunwayLegend />}
        {rows.length ? <CaseTable cases={rows} showRunway={view === 'preop'} showSurgeon /> : <EmptyState icon={Search} title="No cases match these filters">Clear the search or choose another filter.</EmptyState>}
      </Panel>
    </>
  );
}
