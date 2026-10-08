import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { useActions, useLookup } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { generatePlan } from '../../services/planGenerator';
import { addDays, formatDate } from '../../utils/date';
import { COMORBIDITIES, OWNER_LABELS } from '../../config/constants';
import { PageHeader, Panel, Field, Input, Select, Check, Button, Tabs, EmptyState } from '../../components/ui';

const EMPTY_PATIENT = { name: '', age: '', gender: 'Female', phone: '', city: '', language: 'ur', attendant: '', bmi: '', comorbidities: [], smoker: false };

export default function NewCase() {
  const { state } = useStore();
  const { user } = useAuth();
  const { today } = useLookup();
  const actions = useActions();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState('existing');
  const [patientId, setPatientId] = useState('');
  const [np, setNp] = useState(EMPTY_PATIENT);
  const [templateId, setTemplateId] = useState(state.templates[0]?.id || '');
  const [surgeryDate, setSurgeryDate] = useState(addDays(today, 10));
  const [surgeonId, setSurgeonId] = useState(user.role === 'surgeon' ? user.id : state.users.find((u) => u.role === 'surgeon')?.id || '');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const openCase = new Set(state.cases.filter((c) => !['RECOVERED', 'CANCELLED'].includes(c.status)).map((c) => c.patientId));
  const patientOptions = state.patients.filter((p) => !openCase.has(p.id)).map((p) => ({ value: p.id, label: `${p.name} · ${p.mrn} · ${p.age} y` }));

  const patient = mode === 'existing'
    ? state.patients.find((p) => p.id === patientId)
    : { ...np, age: Number(np.age) || 0, bmi: Number(np.bmi) || 0 };
  const template = state.templates.find((t) => t.id === templateId);

  const plan = useMemo(
    () => (patient && template ? generatePlan({ template, patient, surgeryDate, today, rules: state.rules }) : []),
    [patient, template, surgeryDate, today, state.rules]
  );

  const setP = (k) => (e) => setNp((p) => ({ ...p, [k]: e.target.value }));
  const toggleCond = (cond) => setNp((p) => ({ ...p, comorbidities: p.comorbidities.includes(cond) ? p.comorbidities.filter((x) => x !== cond) : [...p.comorbidities, cond] }));

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (mode === 'existing' && !patientId) err.patient = 'Choose a patient';
    if (mode === 'new') {
      if (!np.name.trim()) err.name = 'Enter the patient name';
      if (!(Number(np.age) > 0)) err.age = 'Enter age in years';
      if (!/^03\d{2}-?\d{7}$/.test(np.phone.trim())) err.phone = 'Use a mobile number like 0300-1234567';
    }
    if (surgeryDate < addDays(today, 3)) err.date = 'Allow at least 3 days for preparation';
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    let pid = patientId;
    if (mode === 'new') {
      const created = await actions.createPatient({ ...np, name: np.name.trim(), age: Number(np.age), bmi: Number(np.bmi) || undefined });
      pid = created?.id;
    }
    const id = pid ? await actions.createCase({ patientId: pid, procedureTypeId: templateId, surgeryDate, surgeonId }) : null;
    setBusy(false);
    if (!id) return;
    toast(`Listed for surgery. A readiness plan with ${plan.length} items was created and the team was notified.`);
    navigate(`/cases/${id}`);
  };

  return (
    <>
      <PageHeader title="List a patient for surgery">The readiness plan is built from the procedure template and the patient's conditions, with each deadline counted back from the surgery date.</PageHeader>
      <form className="grid grid--detail" onSubmit={submit} noValidate>
        <div className="stack">
          <Panel title="Patient">
            <Tabs value={mode} onChange={setMode} tabs={[{ value: 'existing', label: 'Registered patient' }, { value: 'new', label: 'New patient' }]} />
            {mode === 'existing' ? (
              <Field label="Patient" error={errors.patient} hint="Patients with an open case are not listed">
                {(id) => <Select id={id} value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Choose a patient" options={patientOptions} />}
              </Field>
            ) : (
              <div className="form-grid">
                <Field label="Full name" error={errors.name} className="span-2">{(id) => <Input id={id} value={np.name} onChange={setP('name')} />}</Field>
                <Field label="Age" error={errors.age}>{(id) => <Input id={id} type="number" min="1" value={np.age} onChange={setP('age')} />}</Field>
                <Field label="Gender">{(id) => <Select id={id} value={np.gender} onChange={setP('gender')} options={['Female', 'Male']} />}</Field>
                <Field label="Mobile number" error={errors.phone}>{(id) => <Input id={id} value={np.phone} onChange={setP('phone')} placeholder="0300-1234567" />}</Field>
                <Field label="City">{(id) => <Input id={id} value={np.city} onChange={setP('city')} />}</Field>
                <Field label="Attendant">{(id) => <Input id={id} value={np.attendant} onChange={setP('attendant')} placeholder="Name (relation)" />}</Field>
                <Field label="App language">{(id) => <Select id={id} value={np.language} onChange={setP('language')} options={[{ value: 'ur', label: 'Urdu' }, { value: 'en', label: 'English' }]} />}</Field>
                <Field label="BMI">{(id) => <Input id={id} type="number" step="0.1" value={np.bmi} onChange={setP('bmi')} />}</Field>
                <div className="field span-2">
                  <span className="field__label">Conditions</span>
                  <div className="checks">
                    {COMORBIDITIES.map((cnd) => <Check key={cnd} label={cnd} checked={np.comorbidities.includes(cnd)} onChange={() => toggleCond(cnd)} />)}
                    <Check label="Smoker" checked={np.smoker} onChange={(e) => setNp((p) => ({ ...p, smoker: e.target.checked }))} />
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Operation">
            <div className="form-grid">
              <Field label="Procedure" className="span-2">{(id) => <Select id={id} value={templateId} onChange={(e) => setTemplateId(e.target.value)} options={state.templates.map((t) => ({ value: t.id, label: t.name }))} />}</Field>
              <Field label="Surgery date" error={errors.date}>{(id) => <Input id={id} type="date" value={surgeryDate} min={addDays(today, 3)} onChange={(e) => setSurgeryDate(e.target.value)} />}</Field>
              <Field label="Surgeon">{(id) => <Select id={id} value={surgeonId} onChange={(e) => setSurgeonId(e.target.value)} options={state.users.filter((u) => u.role === 'surgeon' && u.active).map((u) => ({ value: u.id, label: u.name }))} />}</Field>
            </div>
          </Panel>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'List patient and create plan'}</Button>
          </div>
        </div>

        <Panel title="Readiness plan preview" subtitle={patient?.name ? `For ${patient.name}, surgery ${formatDate(surgeryDate)}` : 'Choose a patient to see the plan'}>
          {plan.length === 0 ? (
            <EmptyState icon={Sparkles} title="The plan appears here">Choose or enter a patient. Conditions such as diabetes add the matching tests automatically.</EmptyState>
          ) : (
            <ol className="plan-preview">
              {plan.map((it) => (
                <li key={it.id}>
                  <span className="plan-preview__date">{formatDate(it.deadline)}</span>
                  <span>
                    <strong>{it.title}</strong>
                    <span className="cell-sub">{OWNER_LABELS[it.owner]}{it.reason ? ` · ${it.reason}` : ''}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </form>
    </>
  );
}
