import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { useConfirm } from '../components/Confirm';
import { ErrorBanner } from '../components/Bits';
import { ROLE_LABELS } from '../utils/constants';

const EMPTY = { name: '', email: '', password: '', phone: '', role: 'client', school: '', schools: [], active: true };

export default function Gebruikers() {
  const { user: me } = useAuth();
  const { schools } = useApp();
  const [users, setUsers] = useState([]);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = me.role === 'admin';
  const confirm = useConfirm();

  const load = useCallback(() => api.get('/users').then((r) => setUsers(r.data)).catch((e) => setError(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  const schoolName = (id) => schools.find((s) => s._id === id)?.name || '—';
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  const toggleSchool = (id) => setEdit({ ...edit, schools: edit.schools.includes(id) ? edit.schools.filter((x) => x !== id) : [...edit.schools, id] });

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (edit.id) {
        const body = { name: edit.name, phone: edit.phone, active: edit.active };
        if (edit.password) body.password = edit.password;
        if (isAdmin) Object.assign(body, { role: edit.role, school: edit.school || null, schools: edit.schools });
        await api.put(`/users/${edit.id}`, body);
      } else {
        await api.post('/users', { ...edit, school: edit.role === 'client' ? edit.school : undefined });
      }
      setEdit(null); load();
    } catch (err) { setError(errMsg(err, 'Opslaan mislukt.')); }
    finally { setBusy(false); }
  }

  async function remove() {
    const ok = await confirm({
      title: 'Gebruiker verwijderen?',
      message: `Het account van ${edit.name} (${edit.email}) wordt definitief verwijderd. Dit kan niet ongedaan worden gemaakt.\n\nWil je enkel de toegang afsluiten, deactiveer het account dan.`,
      confirmLabel: 'Gebruiker verwijderen',
    });
    if (!ok) return;
    setBusy(true); setError('');
    try { await api.delete(`/users/${edit.id}`); setEdit(null); load(); }
    catch (err) { setError(errMsg(err, 'Verwijderen mislukt.')); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gebruikers</h1>
          <p>{isAdmin ? 'Beheer admins, consultants en schoolaccounts.' : 'Nodig gebruikers van je scholen uit voor het klantenportaal.'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(''); setEdit({ ...EMPTY, school: schools[0]?._id || '' }); }}>+ Nieuwe gebruiker</button>
      </div>
      <ErrorBanner message={error && !edit ? error : ''} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Naam</th><th>E-mail</th><th>Rol</th><th>School(en)</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className="role-tag">{ROLE_LABELS[u.role]}</span></td>
                <td>{u.role === 'client' ? schoolName(u.school) : u.role === 'consultant' ? (u.schools.map(schoolName).join(', ') || 'Geen') : 'Alle'}</td>
                <td>{u.active ? <span className="badge status-active">Actief</span> : <span className="badge status-inactive">Gedeactiveerd</span>}</td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-sm" onClick={() => { setError(''); setEdit({ ...EMPTY, ...u, password: '' }); }}>Bewerken</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Gebruiker bewerken' : 'Nieuwe gebruiker'} onClose={() => setEdit(null)}>
          <ErrorBanner message={error} />
          <form onSubmit={save}>
            <div className="field"><label>Naam</label><input required value={edit.name} onChange={set('name')} /></div>
            <div className="field"><label>E-mailadres</label><input type="email" required disabled={!!edit.id} value={edit.email} onChange={set('email')} /></div>
            <div className="field">
              <label>{edit.id ? 'Nieuw wachtwoord (leeg laten = ongewijzigd)' : 'Tijdelijk wachtwoord (min. 8 tekens)'}</label>
              <input type="password" minLength={8} required={!edit.id} value={edit.password} onChange={set('password')} autoComplete="new-password" />
            </div>
            <div className="field-row">
              <div className="field"><label>Rol</label>
                <select value={edit.role} onChange={set('role')} disabled={!isAdmin}>
                  <option value="client">School (klantenportaal)</option>
                  {isAdmin && <option value="consultant">Consultant</option>}
                  {isAdmin && <option value="admin">Admin</option>}
                </select>
              </div>
              <div className="field"><label>Telefoon</label><input value={edit.phone || ''} onChange={set('phone')} /></div>
            </div>
            {edit.role === 'client' && (
              <div className="field"><label>School</label>
                <select required value={edit.school || ''} onChange={set('school')}>
                  <option value="">Kies een school…</option>
                  {schools.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <div className="hint">Dit account ziet enkel de gegevens van deze school.</div>
              </div>
            )}
            {edit.role === 'consultant' && (
              <div className="field"><label>Toegewezen scholen</label>
                {schools.map((s) => (
                  <label className="checkbox-row" key={s._id} style={{ marginBottom: 4 }}>
                    <input type="checkbox" checked={edit.schools.includes(s._id)} onChange={() => toggleSchool(s._id)} /> {s.name}
                  </label>
                ))}
              </div>
            )}
            {edit.id && (
              <label className="checkbox-row" style={{ marginBottom: 16 }}>
                <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Account is actief
              </label>
            )}
            <div className="modal-actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
              {edit.id && isAdmin && edit.id !== me.id && <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>Verwijderen</button>}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
