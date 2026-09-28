import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { useConfirm } from '../components/Confirm';
import { ErrorBanner } from '../components/Bits';

const EMPTY = { name: '', institutionNumber: '', city: '', contactName: '', contactEmail: '', contactPhone: '', notes: '', active: true, clientCanEditPlanStructure: false };

export default function Scholen() {
  const { user } = useAuth();
  const { schools, schoolId, setSchoolId, reload } = useApp();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { _id, createdAt, updatedAt, __v, ...body } = edit;
      if (_id) await api.put(`/schools/${_id}`, body); else await api.post('/schools', body);
      await reload();
      setEdit(null);
    } catch (err) { setError(errMsg(err, 'Opslaan mislukt.')); }
    finally { setBusy(false); }
  }
  async function remove() {
    const ok = await confirm({
      title: 'School verwijderen?',
      message: `"${edit.name}" wordt definitief verwijderd, samen met alle antwoorden, het jaarplan, alle documenten en de schoolaccounts van deze school.\n\nDit kan niet ongedaan worden gemaakt. Wil je de school enkel verbergen, zet ze dan op inactief.`,
      confirmLabel: 'School verwijderen',
    });
    if (!ok) return;
    setBusy(true); setError('');
    try {
      await api.delete(`/schools/${edit._id}`);
      await reload();
      setEdit(null);
    } catch (err) { setError(errMsg(err, 'Verwijderen mislukt.')); }
    finally { setBusy(false); }
  }
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div>
      <div className="page-header">
        <div><h1>Scholen</h1><p>De scholen en scholengroepen die je opvolgt.</p></div>
        {user.role === 'admin' && <button className="btn btn-primary" onClick={() => { setError(''); setEdit({ ...EMPTY }); }}>+ Nieuwe school</button>}
      </div>
      <ErrorBanner message={error && !edit ? error : ''} />
      <div className="table-wrap">
        {schools.length === 0 ? <div className="empty-state">Nog geen scholen.</div> : (
          <table>
            <thead><tr><th>School</th><th>Gemeente</th><th>Contact</th><th>Schoolgebruikers bewerken plan?</th><th></th></tr></thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s._id}>
                  <td><strong>{s.name}</strong>{!s.active && <span className="badge status-inactive" style={{ marginLeft: 8 }}>inactief</span>}{s._id === schoolId && <span className="badge" style={{ marginLeft: 8 }}>actief</span>}</td>
                  <td>{s.city || '—'}</td>
                  <td>{s.contactName || '—'}<div className="muted">{s.contactEmail}</div></td>
                  <td>{s.clientCanEditPlanStructure ? 'Ja, ook taken toevoegen' : 'Enkel status & acties'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm" onClick={() => { setSchoolId(s._id); navigate('/'); }}>Openen</button>{' '}
                    <button className="btn btn-sm" onClick={() => { setError(''); setEdit({ ...EMPTY, ...s }); }}>Bewerken</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <Modal title={edit._id ? 'School bewerken' : 'Nieuwe school'} onClose={() => setEdit(null)}>
          <ErrorBanner message={error} />
          <form onSubmit={save}>
            <div className="field"><label>Naam</label><input required value={edit.name} onChange={set('name')} /></div>
            <div className="field-row">
              <div className="field"><label>Instellingsnummer</label><input value={edit.institutionNumber || ''} onChange={set('institutionNumber')} /></div>
              <div className="field"><label>Gemeente</label><input value={edit.city || ''} onChange={set('city')} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Contactpersoon</label><input value={edit.contactName || ''} onChange={set('contactName')} /></div>
              <div className="field"><label>E-mail</label><input type="email" value={edit.contactEmail || ''} onChange={set('contactEmail')} /></div>
            </div>
            <div className="field"><label>Telefoon</label><input value={edit.contactPhone || ''} onChange={set('contactPhone')} /></div>
            <div className="field"><label>Notities</label><textarea rows={3} value={edit.notes || ''} onChange={set('notes')} /></div>
            <label className="checkbox-row" style={{ marginBottom: 8 }}>
              <input type="checkbox" checked={!!edit.clientCanEditPlanStructure} onChange={set('clientCanEditPlanStructure')} />
              Schoolgebruikers mogen ook taken toevoegen, verwijderen en drempelwaarden aanpassen
            </label>
            <label className="checkbox-row" style={{ marginBottom: 16 }}>
              <input type="checkbox" checked={!!edit.active} onChange={set('active')} /> School is actief
            </label>
            <div className="modal-actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
              {edit._id && user.role === 'admin' && <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>Verwijderen</button>}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
