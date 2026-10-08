import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, CalendarX2, Ban, Stethoscope } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { useActions, useLookup } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { countdown, formatDate, formatLong } from '../../utils/date';
import { isPreop } from '../../services/workflow';
import { Panel, StatusPill, Tabs, Button, EmptyState, Meter } from '../../components/ui';
import LifecycleStepper from '../../components/case/LifecycleStepper';
import ReadinessRunway from '../../components/case/ReadinessRunway';
import RunwayLegend from '../../components/case/RunwayLegend';
import ReadinessChecklist from '../../components/case/ReadinessChecklist';
import RiskPanel from '../../components/case/RiskPanel';
import CaseActions from '../../components/case/CaseActions';
import RecoveryPanel from '../../components/case/RecoveryPanel';
import MessageThread from '../../components/case/MessageThread';
import ActivityLog from '../../components/case/ActivityLog';
import AssessmentModal from '../../components/case/AssessmentModal';
import { AddTaskModal, EditCaseModal } from '../../components/case/CaseModals';
import { Plus, Pencil } from 'lucide-react';

export default function CaseDetail() {
  const { id } = useParams();
  const { state } = useStore();
  const { user } = useAuth();
  const { enrich, today, user: findUser } = useLookup();
  const actions = useActions();
  const { toast } = useToast();
  const raw = state.cases.find((c) => c.id === id);
  const [tab, setTab] = useState(null);
  const [assessing, setAssessing] = useState(false);
  const [modal, setModal] = useState(null);

  if (!raw) {
    return <EmptyState title="Case not found" action={<Link className="btn btn--primary" to="/board">Back to the readiness board</Link>}>It may have been removed when the demo was reset.</EmptyState>;
  }

  const c = enrich(raw);
  const { patient } = c;
  const preop = isPreop(c);
  const current = tab || (preop || ['CANCELLED', 'DEFERRED'].includes(c.status) ? 'readiness' : 'recovery');
  const openAlerts = c.alerts.filter((a) => a.status === 'open').length;

  return (
    <>
      <Link to={user.role === 'admin' ? '/admin' : '/board'} className="back"><ArrowLeft size={16} aria-hidden /> Readiness board</Link>

      <header className="case-head">
        <div className="case-head__main">
          <div className="case-head__title">
            <h1>{patient.name}</h1>
            <StatusPill status={c.status} />
          </div>
          <p className="case-head__meta">
            {patient.mrn} · {patient.age} y · {patient.gender} · {c.procedureName} · {c.surgeon.name}
          </p>
        </div>
        <div className="case-head__date">
          <span>{['COMPLETED', 'DISCHARGED', 'RECOVERY', 'RECOVERED'].includes(c.status) ? 'Operated' : 'Surgery'}</span>
          <strong>{formatLong(c.operation?.date || c.surgeryDate)}</strong>
          {preop && <em>{countdown(c.surgeryDate, today)}</em>}
        </div>
      </header>

      {['surgeon', 'coordinator'].includes(user.role) && !['RECOVERED', 'CANCELLED'].includes(c.status) && (
        <div className="case-tools"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setModal('edit')}>Edit date & staff</Button></div>
      )}
      <LifecycleStepper status={c.status} />
      <CaseActions c={raw} />

      {c.deferral && c.status === 'DEFERRED' && (
        <div className="callout callout--warn"><CalendarX2 size={18} aria-hidden /> Deferred on {formatDate(c.deferral.date)} by {findUser(c.deferral.by)?.name}: {c.deferral.reason} Proposed new date {formatDate(c.deferral.newDate)}.</div>
      )}
      {c.cancellation && (
        <div className="callout callout--bad"><Ban size={18} aria-hidden /> Cancelled on {formatDate(c.cancellation.date)} ({c.cancellation.category}): {c.cancellation.reason}</div>
      )}

      <Tabs
        value={current}
        onChange={setTab}
        tabs={[
          { value: 'readiness', label: 'Readiness', count: c.readiness.total - c.readiness.done || null },
          { value: 'assessment', label: 'Anaesthesia' },
          { value: 'recovery', label: 'Recovery', count: openAlerts || null },
          { value: 'messages', label: 'Messages', count: c.messages.length || null },
          { value: 'activity', label: 'Activity' },
        ]}
      />

      {current === 'readiness' && (
        <div className="grid grid--detail">
          <div className="stack">
            {preop && (
              <Panel title="Readiness timeline" subtitle={`${c.readiness.done} of ${c.readiness.total} items complete`}>
                <ReadinessRunway c={c} today={today} />
                <RunwayLegend />
              </Panel>
            )}
            <Panel title="Readiness plan" subtitle="Generated from the procedure template and the patient's conditions" flush
              actions={preop && ['surgeon', 'anaesthetist', 'coordinator'].includes(user.role) && <Button size="sm" variant="secondary" icon={Plus} onClick={() => setModal('task')}>Add task</Button>}>
              <ReadinessChecklist c={raw} onAssess={() => setAssessing(true)} />
            </Panel>
          </div>
          <div className="stack">
            <RiskPanel risk={c.risk} />
            <PatientCard patient={patient} c={c} />
          </div>
        </div>
      )}

      {current === 'assessment' && (
        <Panel
          title="Pre-anaesthesia assessment"
          actions={user.role === 'anaesthetist' && preop && <Button icon={Stethoscope} onClick={() => setAssessing(true)}>{c.assessment ? 'Update assessment' : 'Record assessment'}</Button>}
        >
          {c.assessment ? (
            <dl className="details">
              <div><dt>Assessed</dt><dd>{formatDate(c.assessment.date)} by {findUser(c.assessment.by)?.name}</dd></div>
              <div><dt>ASA grade</dt><dd>{c.assessment.asa}</dd></div>
              <div><dt>Airway</dt><dd>{c.assessment.airway}</dd></div>
              <div><dt>Fasting instructions</dt><dd>{c.assessment.fasting}</dd></div>
              <div><dt>Medicines</dt><dd>{c.assessment.medicineHolds || '—'}</dd></div>
              <div><dt>Abnormal results</dt><dd>{c.labs?.abnormal?.join(', ') || 'None recorded'}</dd></div>
              <div><dt>Notes</dt><dd>{c.assessment.notes || '—'}</dd></div>
              {c.assessment.clearedOn && <div><dt>Cleared</dt><dd>{formatDate(c.assessment.clearedOn)} by {findUser(c.assessment.clearedBy)?.name}</dd></div>}
            </dl>
          ) : (
            <EmptyState icon={Stethoscope} title="Not assessed yet">The anaesthetist records ASA grade, fasting and medicine instructions here. Instructions go straight to the patient's app.</EmptyState>
          )}
        </Panel>
      )}

      {current === 'recovery' && <RecoveryPanel c={raw} />}
      {current === 'messages' && (
        <Panel title="Messages with the patient">
          <MessageThread c={raw} />
        </Panel>
      )}
      {current === 'activity' && (
        <Panel title="Activity">
          <ActivityLog activity={c.activity} />
        </Panel>
      )}

      {modal === 'task' && <AddTaskModal c={raw} onClose={() => setModal(null)} />}
      {modal === 'edit' && <EditCaseModal c={raw} onClose={() => setModal(null)} />}
      {assessing && (
        <AssessmentModal
          open
          c={raw}
          onClose={() => setAssessing(false)}
          onSave={(form) => {
            actions.saveAssessment(c.id, form).then((ok) => { if (ok) { setAssessing(false); toast('Assessment saved. Instructions were sent to the patient.'); } });
          }}
        />
      )}
    </>
  );
}

function PatientCard({ patient, c }) {
  const { today } = useLookup();
  return (
    <Panel title="Patient">
      <dl className="details details--compact">
        <div><dt>Phone</dt><dd><a href={`tel:${patient.phone}`} className="link"><Phone size={14} aria-hidden /> {patient.phone}</a></dd></div>
        <div><dt>Attendant</dt><dd>{patient.attendant}</dd></div>
        <div><dt>City</dt><dd>{patient.city}</dd></div>
        <div><dt>Language</dt><dd>{patient.language === 'ur' ? 'Urdu' : 'English'}</dd></div>
        <div><dt>Conditions</dt><dd>{patient.comorbidities.join(', ') || 'None'}</dd></div>
        <div><dt>BMI</dt><dd>{patient.bmi}{patient.smoker ? ' · smoker' : ''}</dd></div>
        <div><dt>Last response</dt><dd>{formatDate(c.lastPatientActivity)} ({countdown(c.lastPatientActivity, today)})</dd></div>
        <div><dt>Attendance</dt><dd>{c.confirmations?.patient ? `Confirmed ${formatDate(c.confirmations.patient)}` : 'Not confirmed yet'}</dd></div>
      </dl>
      <p className="small muted" style={{ marginTop: 12 }}>Readiness</p>
      <Meter value={c.readiness.pct} />
    </Panel>
  );
}
