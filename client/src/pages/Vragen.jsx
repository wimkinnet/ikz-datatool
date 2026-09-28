import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api/axios';
import Modal from '../components/Modal';
import { useConfirm } from '../components/Confirm';
import { ErrorBanner } from '../components/Bits';
import { MONTHS, monthLabel, ANSWER_TYPES } from '../utils/constants';

const EMPTY = { month: 'september', section: '', group: '', text: '', answerType: 'number', unit: '', active: true };

// Admin: maintain the questionnaire template (formerly the monthly Excel tabs)
export default function Vragen() {
  const confirm = useConfirm();
  const [questions, setQuestions] = useState([]);
  const [month, setMonth] = useState('september');
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get('/questions', { params: { all: 1 } }).then((r) => setQuestions(r.data)).catch((e) => setError(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  const list = questions.filter((q) => q.month === month);
  const typeLabel = (t) => ANSWER_TYPES.find((x) => x.key === t)?.label || t;
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const body = { month: edit.month, section: edit.section, group: edit.group, text: edit.text, answerType: edit.answerType, unit: edit.unit, active: edit.active, order: edit.order };
      if (edit._id) await api.put(`/questions/${edit._id}`, body); else await api.post('/questions', body);
      setEdit(null); load();
    } catch (err) { setError(errMsg(err, 'Opslaan mislukt.')); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!(await confirm({ title: 'Vraag verwijderen?', message: `"${edit.text}" wordt definitief verwijderd uit de vragenlijst.` }))) return;
    try { await api.delete(`/questions/${edit._id}`); setEdit(null); load(); } catch (err) { setError(errMsg(err)); }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Vragen</h1><p>De vragenlijst die alle scholen invullen. Het antwoordtype bepaalt het invulveld én of de vraag in een grafiek kan.</p></div>
        <button className="btn btn-primary" onClick={() => { setError(''); const last = list[list.length - 1]; setEdit({ ...EMPTY, month, section: last?.section || '', group: last?.group || '' }); }}>+ Nieuwe vraag</button>
      </div>
      <ErrorBanner message={error && !edit ? error : ''} />
      <div className="month-tabs">
        {MONTHS.map((m) => <button key={m.key} className={`month-tab ${m.key === month ? 'active' : ''}`} onClick={() => setMonth(m.key)}>{m.label}</button>)}
      </div>
      <div className="table-wrap">
        {list.length === 0 ? <div className="empty-state">Geen vragen voor {monthLabel(month)}.</div> : (
          <table>
            <thead><tr><th>Sectie</th><th>Groep</th><th>Vraag</th><th>Antwoordtype</th><th></th></tr></thead>
            <tbody>
              {list.map((q) => (
                <tr key={q._id} style={q.active ? undefined : { opacity: 0.5 }}>
                  <td>{q.section}</td>
                  <td className="muted" style={{ maxWidth: 200 }}>{q.group}</td>
                  <td>{q.text}{q.sumOf?.length > 0 && <span className="badge" style={{ marginLeft: 6 }}>som van {q.sumOf.length}</span>}{!q.active && <span className="badge status-inactive" style={{ marginLeft: 6 }}>inactief</span>}</td>
                  <td>{typeLabel(q.answerType)}</td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-sm" onClick={() => { setError(''); setEdit({ ...EMPTY, ...q }); }}>Bewerken</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <Modal title={edit._id ? 'Vraag bewerken' : 'Nieuwe vraag'} onClose={() => setEdit(null)} wide>
          <ErrorBanner message={error} />
          <form onSubmit={save}>
            <div className="field"><label>Vraag</label><textarea required rows={2} value={edit.text} onChange={set('text')} /></div>
            <div className="field-row">
              <div className="field"><label>Peilmoment</label><select value={edit.month} onChange={set('month')}>{MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></div>
              <div className="field"><label>Antwoordtype</label><select value={edit.answerType} onChange={set('answerType')} disabled={edit.sumOf?.length > 0}>{ANSWER_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Sectie (groene kop)</label><input value={edit.section} onChange={set('section')} /></div>
              <div className="field"><label>Groep (beige kop)</label><input value={edit.group} onChange={set('group')} /></div>
            </div>
            <label className="checkbox-row" style={{ marginBottom: 16 }}><input type="checkbox" checked={edit.active} onChange={set('active')} /> Vraag is actief (zichtbaar voor scholen)</label>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
              {edit._id && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
            </div>
            {edit._id && <div className="hint" style={{ marginTop: 8 }}>Een vraag met antwoorden kan niet verwijderd worden; zet ze dan op inactief.</div>}
          </form>
        </Modal>
      )}
    </div>
  );
}
