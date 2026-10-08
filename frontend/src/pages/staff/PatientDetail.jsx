import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Phone } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useActions } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/date';
import { Panel, Button, StatusPill, LoadingState, ErrorState, DataTable } from '../../components/ui';
import PatientForm from '../../components/case/PatientForm';

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const actions = useActions();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const load = () => api.get(`/patients/${id}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState message={error} onRetry={() => { setError(''); load(); }} />;
  if (!data) return <LoadingState label="Loading patient…" />;
  const canEdit = ['surgeon', 'coordinator'].includes(user.role);

  return (
    <>
      <Link to="/patients" className="back"><ArrowLeft size={16} aria-hidden /> Patients</Link>
      <header className="case-head">
        <div className="case-head__main">
          <h1>{data.name}</h1>
          <p className="case-head__meta">{data.mrn} · {data.age} y · {data.gender} · {data.city || 'City not recorded'}</p>
        </div>
        {canEdit && <Button icon={Pencil} variant="secondary" onClick={() => setEditing(true)}>Edit details</Button>}
      </header>
      <div className="grid grid--detail">
        <Panel title="Surgical history" subtitle="All procedures listed for this patient" flush>
          <DataTable rows={data.history} empty="No procedures listed yet"
            columns={[
              { key: 'procedureName', label: 'Procedure', render: (h) => <Link className="cell-title" to={`/cases/${h.id}`}>{h.procedureName}</Link> },
              { key: 'surgeryDate', label: 'Surgery date', render: (h) => formatDate(h.surgeryDate) },
              { key: 'surgeon', label: 'Surgeon' },
              { key: 'stage', label: 'Stage', render: (h) => <StatusPill status={h.stage} /> },
              { key: 'outcome', label: 'Outcome', render: (h) => h.outcome || <span className="muted">—</span> },
            ]} />
        </Panel>
        <Panel title="Details">
          <dl className="details details--compact">
            <div><dt>Mobile</dt><dd><a className="link" href={`tel:${data.phone}`}><Phone size={14} aria-hidden /> {data.phone}</a></dd></div>
            <div><dt>Attendant</dt><dd>{data.attendant || '—'}</dd></div>
            <div><dt>Language</dt><dd>{data.language === 'ur' ? 'Urdu' : 'English'}</dd></div>
            <div><dt>Conditions</dt><dd>{data.comorbidities.join(', ') || 'None'}</dd></div>
            <div><dt>BMI</dt><dd>{data.bmi ?? '—'}{data.smoker ? ' · smoker' : ''}</dd></div>
            <div><dt>Missed visits</dt><dd>{data.previousNoShow ? 'Yes' : 'No'}</dd></div>
            <div><dt>Registered</dt><dd>{formatDate(data.createdAt?.slice(0, 10))}</dd></div>
          </dl>
        </Panel>
      </div>
      {editing && <PatientForm open patient={data} onClose={() => setEditing(false)} onSave={(d) => actions.updatePatient(data.id, d).then((ok) => { if (ok) { toast('Patient details updated.'); load(); } return ok; })} />}
    </>
  );
}
