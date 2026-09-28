import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/axios';
import { ErrorBanner } from '../components/Bits';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errMsg(err, 'Aanmelden mislukt.'));
    } finally { setLoading(false); }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>IKZ Datatool</h1>
        <p className="muted">Meld je aan om de vragenlijst, het jaarplan en de trends van je school te bekijken.</p>
        <ErrorBanner message={error} />
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">E-mailadres</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="password">Wachtwoord</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Bezig…' : 'Aanmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
