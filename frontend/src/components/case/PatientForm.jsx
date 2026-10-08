import { useState } from 'react';
import { Modal, Button, Field, Input, Select, Check } from '../ui';
import { COMORBIDITIES } from '../../config/constants';

const EMPTY = { name: '', age: '', gender: 'Female', phone: '', city: '', language: 'ur', attendant: '', bmi: '', comorbidities: [], smoker: false, previousNoShow: false };

/** Create / edit patient dialog. onSave resolves to a truthy value on success. */
export default function PatientForm({ open, patient, onClose, onSave }) {
  const [f, setF] = useState(() => (patient ? { ...EMPTY, ...patient, bmi: patient.bmi ?? '' } : EMPTY));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (c) => setF((x) => ({ ...x, comorbidities: x.comorbidities.includes(c) ? x.comorbidities.filter((y) => y !== c) : [...x.comorbidities, c] }));

  const save = async () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Enter the patient name';
    if (!(Number(f.age) > 0 && Number(f.age) <= 120)) e.age = 'Enter age in years';
    if (!/^03\d{2}-?\d{7}$/.test(String(f.phone).trim())) e.phone = 'Use a mobile number like 0300-1234567';
    if (f.bmi !== '' && !(Number(f.bmi) >= 10 && Number(f.bmi) <= 80)) e.bmi = 'BMI between 10 and 80';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const ok = await onSave({ name: f.name.trim(), age: Number(f.age), gender: f.gender, phone: String(f.phone).trim(), city: f.city, language: f.language, attendant: f.attendant, bmi: f.bmi === '' ? undefined : Number(f.bmi), comorbidities: f.comorbidities, smoker: f.smoker, previousNoShow: f.previousNoShow });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal open={open} title={patient ? `Edit ${patient.name}` : 'Register patient'} onClose={onClose} width={640}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save patient'}</Button></>}>
      <div className="form-grid">
        <Field label="Full name" error={errors.name} className="span-2">{(id) => <Input id={id} value={f.name} onChange={set('name')} />}</Field>
        <Field label="Age" error={errors.age}>{(id) => <Input id={id} type="number" min="1" value={f.age} onChange={set('age')} />}</Field>
        <Field label="Gender">{(id) => <Select id={id} value={f.gender} onChange={set('gender')} options={['Female', 'Male', 'Other']} />}</Field>
        <Field label="Mobile number" error={errors.phone}>{(id) => <Input id={id} value={f.phone} onChange={set('phone')} placeholder="0300-1234567" />}</Field>
        <Field label="City">{(id) => <Input id={id} value={f.city} onChange={set('city')} />}</Field>
        <Field label="Attendant">{(id) => <Input id={id} value={f.attendant} onChange={set('attendant')} placeholder="Name (relation)" />}</Field>
        <Field label="App language">{(id) => <Select id={id} value={f.language} onChange={set('language')} options={[{ value: 'ur', label: 'Urdu' }, { value: 'en', label: 'English' }]} />}</Field>
        <Field label="BMI" error={errors.bmi}>{(id) => <Input id={id} type="number" step="0.1" value={f.bmi} onChange={set('bmi')} />}</Field>
        <div className="field span-2">
          <span className="field__label">Conditions</span>
          <div className="checks">
            {COMORBIDITIES.map((c) => <Check key={c} label={c} checked={f.comorbidities.includes(c)} onChange={() => toggle(c)} />)}
            <Check label="Smoker" checked={f.smoker} onChange={(e) => setF((x) => ({ ...x, smoker: e.target.checked }))} />
            <Check label="Missed a previous appointment" checked={f.previousNoShow} onChange={(e) => setF((x) => ({ ...x, previousNoShow: e.target.checked }))} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
