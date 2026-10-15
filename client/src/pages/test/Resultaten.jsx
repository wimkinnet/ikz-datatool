import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../../api/axios';
import Modal from '../../components/Modal';
import { useConfirm } from '../../components/Confirm';
import { ErrorBanner } from '../../components/Bits';
import { CategoryTag } from '../../test/TestBits';
import { TEST_CATEGORIES } from '../../utils/constants';

const EMPTY = { name: '', category: 'proces', description: '', active: true };

// Admin (Test): the shared library of beoogde resultaten that operational goals link to
export default function Resultaten() {
  const confirm = useConfirm();
  const [results, setResults] = useState([]);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get('/test/results', { params: { all: 1 } }).then((r) => setResults(r.data)).catch((e) => setError(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const body = { name: edit.name, category: edit.category, description: edit.description, active: edit.active };
      if (edit._id) await api.put(`/test/results/${edit._id}`, body); else await api.post('/test/results', body);
      setEdit(null); load();
    } catch (err) { setError(errMsg(err, 'Opslaan mislukt.')); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!(await confirm({ title: 'Domein verwijderen?', message: `"${edit.name}" wordt definitief verwijderd.` }))) return;
    try { await api.delete(`/test/results/${edit._id}`); setEdit(null); load(); } catch (err) { setError(errMsg(err)); }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Domeinen</h1><p>De gedeelde lijst waaruit scholen kiezen bij hun operationele doelen en meetpunten. Elk domein hoort bij proces, resultaten of context.</p></div>
        <button className="btn btn-primary" onClick={() => { setError(''); setEdit({ ...EMPTY }); }}>+ Nieuw domein</button>
      </div>
      <ErrorBanner message={error && !edit ? error : ''} />
      <div className="table-wrap">
        <table className="plan-table so-table">
          <thead><tr><th>Domein</th><th>Categorie</th><th>Toelichting</th><th></th></tr></thead>
          <tbody>
            {TEST_CATEGORIES.map((c) => (
              <CategoryBlock key={c.key} label={c.label} list={results.filter((r) => r.category === c.key)} onEdit={(r) => { setError(''); setEdit({ ...EMPTY, ...r }); }} />
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit._id ? 'Domein bewerken' : 'Nieuw domein'} onClose={() => setEdit(null)}>
          <ErrorBanner message={error} />
          <form onSubmit={save}>
            <div className="field"><label>Domein</label><input required value={edit.name} onChange={set('name')} /></div>
            <div className="field"><label>Categorie</label>
              <select value={edit.category} onChange={set('category')}>{TEST_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
            </div>
            <div className="field"><label>Toelichting</label><textarea rows={3} value={edit.description} onChange={set('description')} /></div>
            {edit._id && <label className="checkbox-row" style={{ marginBottom: 14 }}><input type="checkbox" checked={edit.active} onChange={set('active')} /> Actief (zichtbaar bij het kiezen)</label>}
            <div className="modal-actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
              {edit._id && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function CategoryBlock({ label, list, onEdit }) {
  return (
    <>
      <tr className="month-row domain-row"><td colSpan={4}>{label} <span style={{ opacity: 0.7, fontWeight: 400 }}>({list.length})</span></td></tr>
      {list.length === 0 && <tr><td colSpan={4} className="muted">Nog geen domeinen.</td></tr>}
      {list.map((r) => (
        <tr key={r._id} style={r.active ? undefined : { opacity: 0.5 }}>
          <td><strong>{r.name}</strong>{!r.active && <span className="badge status-inactive" style={{ marginLeft: 6 }}>inactief</span>}</td>
          <td><CategoryTag category={r.category} /></td>
          <td className="muted">{r.description || '—'}</td>
          <td style={{ textAlign: 'right' }}><button className="btn btn-sm" onClick={() => onEdit(r)}>Bewerken</button></td>
        </tr>
      ))}
    </>
  );
}
