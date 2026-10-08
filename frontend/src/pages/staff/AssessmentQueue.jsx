import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import { useActions, useEnrichedCases, useLookup } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { useStore } from '../../context/StoreContext';
import { countdown, diffDays, formatDate } from '../../utils/date';
import { isPreop, canTransition } from '../../services/workflow';
import { PageHeader, Panel, Button, RiskBadge, StatusPill, EmptyState } from '../../components/ui';
import AssessmentModal from '../../components/case/AssessmentModal';

export default function AssessmentQueue() {
  const { state } = useStore();
  const { today, rules } = useLookup();
  const actions = useActions();
  const { toast } = useToast();
  const [assessing, setAssessing] = useState(null);
  const cases = useEnrichedCases().filter((c) => isPreop(c) && c.status !== 'SCHEDULED').sort((a, b) => diffDays(a.surgeryDate, b.surgeryDate));

  const clear = async (c) => {
    const res = await actions.transition(c.id, 'clear');
    (toast(res.ok ? `${c.patient.name} cleared for surgery.` : res.reason, res.ok ? 'success' : 'warning'));
  };

  return (
    <>
      <PageHeader title="Assessment queue">Earliest surgery first. A case can only be cleared once the assessment is recorded and every required item is complete.</PageHeader>
      <Panel flush>
        {cases.length === 0 ? <EmptyState icon={Stethoscope} title="No cases waiting" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Patient</th><th>Surgery</th><th>Conditions</th><th>Assessment</th><th>Risk</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {cases.map((c) => {
                  const can = canTransition(c, 'clear', 'anaesthetist', today, rules);
                  return (
                    <tr key={c.id}>
                      <td><Link to={`/cases/${c.id}`} className="cell-title">{c.patient.name}, {c.patient.age}</Link><span className="cell-sub">{c.procedureName}</span></td>
                      <td>{formatDate(c.surgeryDate)}<span className="cell-sub">{countdown(c.surgeryDate, today)}</span></td>
                      <td>{c.patient.comorbidities.join(', ') || 'None'}{c.labs?.abnormal?.length > 0 && <span className="cell-sub cell-sub--bad">{c.labs.abnormal.join(', ')}</span>}</td>
                      <td>{c.assessment ? <>{c.assessment.asa}<span className="cell-sub">{formatDate(c.assessment.date)}</span></> : <span className="muted">Not done</span>}</td>
                      <td><RiskBadge risk={c.risk} /></td>
                      <td><StatusPill status={c.status} />{!can.ok && c.assessment && <span className="cell-sub">{c.readiness.blockers.length} item(s) open</span>}</td>
                      <td className="table__actions">
                        <Button size="sm" variant={c.assessment ? 'ghost' : 'primary'} onClick={() => setAssessing(state.cases.find((x) => x.id === c.id))}>{c.assessment ? 'Update' : 'Assess'}</Button>
                        {c.status !== 'READY' && <Button size="sm" variant="secondary" disabled={!can.ok} title={can.reason} onClick={() => clear(c)}>Clear</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {assessing && (
        <AssessmentModal open c={assessing} onClose={() => setAssessing(null)} onSave={(form) => actions.saveAssessment(assessing.id, form).then((ok) => { if (ok) { setAssessing(null); toast('Assessment saved. Instructions were sent to the patient.'); } })} />
      )}
    </>
  );
}
