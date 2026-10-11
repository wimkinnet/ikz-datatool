import { useEffect, useState, useCallback, useMemo } from 'react';
import api, { errMsg } from '../../api/axios';
import Modal from '../../components/Modal';
import { useConfirm } from '../../components/Confirm';
import { ErrorBanner } from '../../components/Bits';
import { RokTags } from '../../so/SoBits';
import { PLAN_MONTHS, SO_SOURCES, monthLabel } from '../../utils/constants';

const EMPTY = { source: 'smartschool', group: '', bron: '', text: '', threshold: '', month: '', rok: [], active: true };

// Admin: maintain the SO indicator template (the rows of the Kwaliteitsmonitor's source tabs)
export default function IndicatorTemplates() {
  const confirm = useConfirm();
  const [indicators, setIndicators] = useState([]);
  const [rok, setRok] = useState([]);
  const [source, setSource] = useState('smartschool');
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get('/so/indicators', { params: { all: 1 } }).then((r) => setIndicators(r.data)).catch((e) => setError(errMsg(e))), []);
  useEffect(() => { load(); api.get('/so/rok').then((r) => setRok(r.data)).catch(() => {}); }, [load]);

  const rokByCode = useMemo(() => Object.fromEntries(rok.map((r) => [r.code, r])), [rok]);
  const domains = useMemo(() => [...new Set(rok.map((r) => r.domain))], [rok]);
  const list = indicators.filter((i) => i.source === source);
  const groups = [...new Set(indicators.filter((i) => i.source === (edit?.source || source)).map((i) => i.group).filter(Boolean))];
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const toggleRok = (code) => setEdit({ ...edit, rok: edit.rok.includes(code) ? edit.rok.filter((c) => c !== code) : [...edit.rok, code] });

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { source: src, group, bron, text, threshold, month, rok: codes, active } = edit;
      const body = { source: src, group, bron, text, threshold, month, rok: codes, active };
      if (edit._id) await api.put(`/so/indicators/${edit._id}`, body); else await api.post('/so/indicators', body);
      setEdit(null); load();
    } catch (err) { setError(errMsg(err, 'Opslaan mislukt.')); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!(await confirm({ title: 'Indicator verwijderen?', message: `"${edit.text}" wordt definitief verwijderd uit de kwaliteitsmonitor.` }))) return;
    try { await api.delete(`/so/indicators/${edit._id}`); setEdit(null); load(); } catch (err) { setError(errMsg(err)); }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Indicatoren</h1><p>De indicatoren van de kwaliteitsmonitor voor alle SO-scholen, met hun koppeling aan het ROK. Scholen schalen ze zelf in.</p></div>
        <button className="btn btn-primary" onClick={() => { setError(''); setEdit({ ...EMPTY, source }); }}>+ Nieuwe indicator</button>
      </div>
      <ErrorBanner message={error && !edit ? error : ''} />
      <div className="month-tabs">
        {SO_SOURCES.map((s) => (
          <button key={s.key} className={`month-tab ${s.key === source ? 'active' : ''}`} onClick={() => setSource(s.key)}>
            {s.label}<small>{indicators.filter((i) => i.source === s.key).length}</small>
          </button>
        ))}
      </div>
      <div className="table-wrap">
        {list.length === 0 ? <div className="empty-state">Nog geen indicatoren voor deze bron.</div> : (
          <table className="so-table">
            <thead><tr><th>Sectie</th><th>Bron</th><th>Indicator</th><th>Drempelwaarde</th><th>Moment</th><th>ROK</th><th></th></tr></thead>
            <tbody>
              {list.map((i) => (
                <tr key={i._id} style={i.active ? undefined : { opacity: 0.5 }}>
                  <td className="muted">{i.group}</td>
                  <td>{i.bron}</td>
                  <td>{i.text}{!i.active && <span className="badge status-inactive" style={{ marginLeft: 6 }}>inactief</span>}</td>
                  <td>{i.threshold || '—'}</td>
                  <td>{i.month ? monthLabel(i.month) : '—'}</td>
                  <td><RokTags codes={i.rok} rokByCode={rokByCode} /></td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-sm" onClick={() => { setError(''); setEdit({ ...EMPTY, ...i }); }}>Bewerken</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <Modal title={edit._id ? 'Indicator bewerken' : 'Nieuwe indicator'} onClose={() => setEdit(null)} wide>
          <ErrorBanner message={error} />
          <form onSubmit={save}>
            <div className="field-row">
              <div className="field"><label>Bron (tabblad)</label>
                <select value={edit.source} onChange={set('source')}>{SO_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
              </div>
              <div className="field"><label>Sectie</label>
                <input list="so-groups" value={edit.group} onChange={set('group')} />
                <datalist id="so-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
              </div>
            </div>
            <div className="field"><label>Bron (waar te vinden)</label><input value={edit.bron} onChange={set('bron')} placeholder="bv. smartschool analytics" /></div>
            <div className="field"><label>Indicator (wat meten?)</label><input required value={edit.text} onChange={set('text')} /></div>
            <div className="field-row">
              <div className="field"><label>Drempelwaarde</label><input value={edit.threshold} onChange={set('threshold')} /></div>
              <div className="field"><label>Standaard monitoringsmoment</label>
                <select value={edit.month} onChange={set('month')}>
                  <option value="">Geen maand</option>
                  {PLAN_MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label>Gekoppelde ROK-verwachtingen</label>
              <div className="rok-picker">
                {domains.map((d) => (
                  <div key={d}>
                    <div className="muted rok-domain">{d}</div>
                    {rok.filter((r) => r.domain === d).map((r) => (
                      <label key={r.code} className="checkbox-row" title={r.title}>
                        <input type="checkbox" checked={edit.rok.includes(r.code)} onChange={() => toggleRok(r.code)} /> <strong>{r.code}</strong> <span className="muted">{r.title}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {edit._id && <label className="checkbox-row" style={{ marginBottom: 14 }}><input type="checkbox" checked={edit.active} onChange={set('active')} /> Actief</label>}
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
