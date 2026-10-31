import { useState } from 'react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/Bits';
import { THEMES, themeOf } from '../utils/themes';

export default function Profiel() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function save(e) {
    e.preventDefault(); setMsg(''); setError('');
    try {
      const body = { name, phone };
      if (newPassword) Object.assign(body, { currentPassword, newPassword });
      const { data } = await api.put('/auth/me', body);
      updateUser(data.user);
      setCurrentPassword(''); setNewPassword('');
      setMsg('Opgeslagen.');
    } catch (err) { setError(errMsg(err, 'Opslaan mislukt.')); }
  }

  // Admins choose their own house style; it applies right away, separately from the form below
  async function chooseTheme(key) {
    setMsg(''); setError('');
    try {
      const { data } = await api.put('/auth/me', { theme: key });
      updateUser(data.user);
    } catch (err) { setError(errMsg(err, 'Stijl wijzigen mislukt.')); }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="page-header"><div><h1>Mijn profiel</h1><p>{user.email}</p></div></div>
      <div className="card">
        <ErrorBanner message={error} />
        {msg && <div className="sub-note">{msg}</div>}
        <form onSubmit={save}>
          <div className="field"><label>Naam</label><input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>Telefoon</label><input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <h3 style={{ marginTop: 20 }}>Wachtwoord wijzigen</h3>
          <div className="field"><label>Huidig wachtwoord</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" /></div>
          <div className="field"><label>Nieuw wachtwoord (min. 8 tekens)</label><input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></div>
          <button className="btn btn-primary" type="submit">Opslaan</button>
        </form>
      </div>
      {user.role === 'admin' && (
        <div className="card">
          <div className="field" style={{ marginBottom: 0 }}><label>Stijl van de tool</label>
            <div className="theme-options">
              {THEMES.map((t) => (
                <label key={t.key} className={`theme-option ${themeOf(user.theme).key === t.key ? 'picked' : ''}`}>
                  <input type="radio" name="theme" checked={themeOf(user.theme).key === t.key} onChange={() => chooseTheme(t.key)} />
                  <img src={t.logo} alt="" /> {t.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
