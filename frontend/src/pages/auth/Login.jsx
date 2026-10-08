import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../config/navigation';
import AuthLayout from '../../components/auth/AuthLayout';
import { Field, Input, Button } from '../../components/ui';

const DEMO = [
  ['Surgeon', 'surgeon@medsync.demo'], ['Anaesthetist', 'anaesthetist@medsync.demo'], ['Nurse / Pre-op Coordinator', 'nurse@medsync.demo'],
  ['Patient (preparing)', 'patient@medsync.demo'], ['Patient (recovering)', 'recovery@medsync.demo'], ['Administrator', 'admin@medsync.demo'],
];

export default function Login() {
  const { login, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return setError('Enter your e-mail and password.');
    setBusy(true); setError('');
    try {
      const user = await login(form.email.trim(), form.password);
      const from = location.state?.from;
      navigate(from && from !== '/login' ? from : homeFor(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth__title">Sign in</h1>
      <p className="muted">Welcome back. Sign in to continue to MedSync.</p>
      {(sessionMessage || location.state?.registered) && <p className="callout" role="status">{location.state?.registered || sessionMessage}</p>}
      <form className="auth__form" onSubmit={submit} noValidate>
        <Field label="E-mail address">{(id) => <Input id={id} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
        <Field label="Password" error={error}>
          {(id) => (
            <div className="input-group">
              <Input id={id} type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          )}
        </Field>
        <Button type="submit" size="lg" icon={LogIn} disabled={busy} className="btn--block">{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <p className="auth__switch">New to MedSync? <Link to="/signup" className="link">Create an account</Link></p>
      <details className="demo-box">
        <summary>Demo accounts (development seed data)</summary>
        <p className="small muted">Available after running the seed or <code>npm run dev:memory</code>. Password for all: <b>Demo@1234</b></p>
        <ul>
          {DEMO.map(([label, email]) => (
            <li key={email}><button type="button" className="link-btn" onClick={() => setForm({ email, password: 'Demo@1234' })}>{label}</button><span className="muted small">{email}</span></li>
          ))}
        </ul>
      </details>
    </AuthLayout>
  );
}
