import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { useActions } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Panel, Button, DataTable, Pill } from '../../components/ui';
import PatientForm from '../../components/case/PatientForm';
import { IMAGES } from '../../assets/images';

export default function Patients() {
  const { state } = useStore();
  const { user } = useAuth();
  const actions = useActions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const canEdit = ['surgeon', 'coordinator'].includes(user.role);
  const rows = state.patients.filter((p) => !q || `${p.name} ${p.mrn} ${p.phone}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="hero-banner">
        <img src={IMAGES.reception} alt="" />
        <div>
          <h1>Patients</h1>
          <p>Registered surgical patients and their procedure history. Search by name, MRN or mobile number.</p>
        </div>
        {canEdit && <Button icon={UserPlus} onClick={() => setAdding(true)}>Register patient</Button>}
      </div>
      <Panel flush>
        <div className="toolbar">
          <label className="search"><Search size={16} aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, MRN or mobile" aria-label="Search patients" /></label>
          <span className="small muted">{rows.length} of {state.patients.length} patients</span>
        </div>
        <DataTable
          rows={rows}
          empty={q ? 'No patients match this search' : 'No patients registered yet'}
          onRowClick={(p) => navigate(`/patients/${p.id}`)}
          columns={[
            { key: 'name', label: 'Patient', render: (p) => <><strong className="cell-title">{p.name}</strong><span className="cell-sub">{p.mrn}</span></> },
            { key: 'age', label: 'Age / gender', render: (p) => `${p.age} · ${p.gender}` },
            { key: 'phone', label: 'Mobile' },
            { key: 'cond', label: 'Conditions', render: (p) => (p.comorbidities.length ? p.comorbidities.join(', ') : <span className="muted">None</span>) },
            { key: 'procs', label: 'Procedures', render: (p) => <Pill tone={p.procedureCount ? 'info' : 'neutral'}>{p.procedureCount || 0}</Pill> },
          ]}
        />
      </Panel>
      {adding && <PatientForm open onClose={() => setAdding(false)} onSave={(data) => actions.createPatient(data).then((ok) => { if (ok) toast(`${data.name} registered.`); return ok; })} />}
    </>
  );
}
