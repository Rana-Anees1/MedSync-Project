import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../config/navigation';
import AuthLayout from '../../components/auth/AuthLayout';
import { Field, Input, Select, Button, Tabs } from '../../components/ui';

const STAFF_ROLES = [{ value: 'surgeon', label: 'Surgeon' }, { value: 'anaesthetist', label: 'Anaesthetist' }, { value: 'coordinator', label: 'Nurse / Pre-op Coordinator' }];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState('patient');
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', mrn: '', phone: '', staffRole: 'surgeon', title: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 3) e.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid e-mail address';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'At least 8 characters with letters and numbers';
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match';
    if (type === 'patient' && !f.mrn.trim()) e.mrn = 'Enter the MRN printed on your hospital card';
    if (type === 'patient' && !/^03\d{2}-?\d{7}$/.test(f.phone.trim())) e.phone = 'Use the mobile number registered with the hospital (0300-1234567)';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e); setServerError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const payload = { name: f.name.trim(), email: f.email.trim(), password: f.password, accountType: type, ...(type === 'patient' ? { mrn: f.mrn.trim(), phone: f.phone.trim() } : { staffRole: f.staffRole, title: f.title.trim() }) };
      const res = await register(payload);
      if (res.pending) navigate('/login', { replace: true, state: { registered: res.message } });
      else navigate(homeFor(res.user.role), { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth__title">Create your account</h1>
      <p className="muted">Patients link their account to their hospital record. Staff accounts are activated by the administrator.</p>
      <Tabs value={type} onChange={setType} tabs={[{ value: 'patient', label: 'I am a patient' }, { value: 'staff', label: 'Hospital staff' }]} />
      <form className="auth__form" onSubmit={submit} noValidate>
        <Field label="Full name" error={errors.name}>{(id) => <Input id={id} autoComplete="name" value={f.name} onChange={set('name')} />}</Field>
        <Field label="E-mail address" error={errors.email}>{(id) => <Input id={id} type="email" autoComplete="email" value={f.email} onChange={set('email')} />}</Field>
        {type === 'patient' ? (
          <div className="form-grid">
            <Field label="Hospital MRN" error={errors.mrn} hint="e.g. MS-1003">{(id) => <Input id={id} value={f.mrn} onChange={set('mrn')} />}</Field>
            <Field label="Registered mobile" error={errors.phone}>{(id) => <Input id={id} inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="0300-1234567" />}</Field>
          </div>
        ) : (
          <div className="form-grid">
            <Field label="Role">{(id) => <Select id={id} value={f.staffRole} onChange={set('staffRole')} options={STAFF_ROLES} />}</Field>
            <Field label="Job title (optional)">{(id) => <Input id={id} value={f.title} onChange={set('title')} placeholder="e.g. Registrar" />}</Field>
          </div>
        )}
        <div className="form-grid">
          <Field label="Password" error={errors.password}>{(id) => <Input id={id} type="password" autoComplete="new-password" value={f.password} onChange={set('password')} />}</Field>
          <Field label="Confirm password" error={errors.confirm}>{(id) => <Input id={id} type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} />}</Field>
        </div>
        {serverError && <p className="callout callout--bad" role="alert">{serverError}</p>}
        <Button type="submit" size="lg" icon={UserPlus} disabled={busy} className="btn--block">{busy ? 'Creating account…' : 'Create account'}</Button>
      </form>
      <p className="auth__switch">Already registered? <Link to="/login" className="link">Sign in</Link></p>
    </AuthLayout>
  );
}
