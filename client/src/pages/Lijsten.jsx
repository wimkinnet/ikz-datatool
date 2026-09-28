import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { ErrorBanner } from '../components/Bits';

const LISTS = [
  { key: 'rok', label: 'ROK-domeinen' },
  { key: 'schaal', label: 'Ontwikkelingsschalen' },
  { key: 'onderdeel', label: 'Onderdelen ontwikkelingsschaal' },
  { key: 'inschaling', label: 'Inschaling' },
  { key: 'status', label: 'Status' },
  { key: 'doorlichtingsdomein', label: 'Doorlichtingsdomein' },
];

// Admin: edit the dropdown lists (formerly the "Verwijzigen" tab)
export default function Lijsten() {
  const { reload } = useApp();
  const [all, setAll] = useState({});
  const [list, setList] = useState('rok');
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api.get('/references', { params: { all: 1 } }).then((r) => setAll(r.data)).catch((e) => setError(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  const items = all[list] || [];
  const schalen = all.schaal || [];

  async function save(e) {
    e.preventDefault(); setError('');
    try {
      if (edit._id) await api.put(`/references/${edit._id}`, { label: edit.label, order: Number(edit.order) || 0, active: edit.active, parent: edit.parent });
      else await api.post('/references', { list, label: edit.label, parent: edit.parent || undefined, order: items.length });
      setEdit(null); await load(); reload();
    } catch (err) { setError(errMsg(err, 'Opslaan mislukt.')); }
  }

  return (
    <div>
      <div className="page-header"><div><h1>Keuzelijsten</h1><p>De opties in de dropdowns van het jaarplan. Oude waarden blijven bewaard als je een optie verbergt.</p></div>
        <button className="btn btn-primary" onClick={() => { setError(''); setEdit({ label: '', parent: list === 'onderdeel' ? schalen[0]?.key : '', active: true }); }}>+ Nieuwe optie</button>
      </div>
      <ErrorBanner message={error && !edit ? error : ''} />
      <div className="month-tabs">
        {LISTS.map((l) => <button key={l.key} className={`month-tab ${l.key === list ? 'active' : ''}`} onClick={() => setList(l.key)}>{l.label}</button>)}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Optie</th>{list === 'onderdeel' && <th>Hoort bij</th>}<th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i._id} style={i.active ? undefined : { opacity: 0.5 }}>
                <td>{i.label}</td>
                {list === 'onderdeel' && <td className="muted">{i.parent}</td>}
                <td>{i.active ? 'Zichtbaar' : 'Verborgen'}</td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-sm" onClick={() => { setError(''); setEdit({ ...i }); }}>Bewerken</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit._id ? 'Optie bewerken' : 'Nieuwe optie'} onClose={() => setEdit(null)}>
          <ErrorBanner message={error} />
          <form onSubmit={save}>
            <div className="field"><label>Naam</label><input required value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} /></div>
            {list === 'onderdeel' && (
              <div className="field"><label>Ontwikkelingsschaal</label>
                <select value={edit.parent || ''} disabled={!!edit._id} onChange={(e) => setEdit({ ...edit, parent: e.target.value })}>
                  {schalen.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            )}
            {edit._id && <label className="checkbox-row" style={{ marginBottom: 14 }}><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Zichtbaar in de dropdown</label>}
            <button className="btn btn-primary" type="submit">Opslaan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
