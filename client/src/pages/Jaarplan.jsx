import { useEffect, useMemo, useState, useCallback } from 'react';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { NoSchool, ErrorBanner, StatusPill } from '../components/Bits';
import Modal from '../components/Modal';
import { useConfirm } from '../components/Confirm';
import { PLAN_MONTHS, STATUS, STATUS_KEYS, monthLabel, monthIdx, NUMERIC_TYPES } from '../utils/constants';

const EMPTY = {
  month: 'september', theme: '', threshold: '', status: 'monitoren', rok1: '', rok2: '', schaal: '', onderdeel: '', inschaling: '',
  source: '', extraInfo: '', action: '', statusMode: 'manual', questionKey: '', thresholdValue: '', thresholdDirection: 'min',
};

// `template` = the default plan admins maintain (rows without a school), which staff copy into a school year
export default function Jaarplan({ template = false }) {
  const { user } = useAuth();
  const { schoolId, year, refList, refLabel, canEditPlanStructure } = useApp();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null); // item being edited (or EMPTY copy for new)
  const [fMonth, setFMonth] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [q, setQ] = useState('');

  const isStaff = user.role !== 'client';
  const canStructure = template || canEditPlanStructure;
  const scope = template ? 'template' : schoolId;

  const load = useCallback(async (silent = false) => {
    if (!scope) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/plan', { params: { school: scope, year: template ? undefined : year } });
      setItems(data);
    } catch (e) { setError(errMsg(e, 'Kon het jaarplan niet laden.')); }
    finally { setLoading(false); }
  }, [scope, year, template]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/questions').then((r) => setQuestions(r.data)).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((i) => (!fMonth || i.month === fMonth) && (!fStatus || i.status === fStatus))
      .filter((i) => !term || [i.theme, i.source, i.extraInfo, i.action, i.rok1, i.rok2, i.onderdeel].join(' ').toLowerCase().includes(term))
      .sort((a, b) => monthIdx(a.month) - monthIdx(b.month) || (a.order || 0) - (b.order || 0));
  }, [items, fMonth, fStatus, q]);

  if (!template && !schoolId) return <NoSchool />;

  async function quickUpdate(item, patch) {
    try {
      await api.put(`/plan/${item._id}`, patch);
      await load(true); // re-fetch so automatic statuses are re-evaluated
    } catch (e) { setError(errMsg(e)); }
  }

  async function applyTemplate(replace = false) {
    try {
      await api.post('/plan/apply-template', { school: schoolId, schoolYear: year, replace });
      load();
    } catch (e) {
      if (e.response?.status === 409 && await confirm({ title: 'Jaarplan vervangen?', message: `${e.response.data.message}\n\nBestaand jaarplan vervangen door het standaardplan?`, confirmLabel: 'Vervangen' })) applyTemplate(true);
      else if (e.response?.status !== 409) setError(errMsg(e));
    }
  }

  const grouped = [];
  filtered.forEach((i) => {
    const last = grouped[grouped.length - 1];
    if (!last || last.month !== i.month) grouped.push({ month: i.month, rows: [i] }); else last.rows.push(i);
  });

  const roks = refList('rok');
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{template ? 'Standaard jaarplan' : `Jaarplan ${year}`}</h1>
          <p>{template ? 'Het sjabloon dat je naar een school kan kopiëren.' : 'Taken en KPI’s per maand, met drempelwaarde, bron en opvolging.'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!template && isStaff && <button className="btn" onClick={() => applyTemplate(false)}>Standaardplan toepassen</button>}
          {canStructure && <button className="btn btn-primary" onClick={() => setEdit({ ...EMPTY })}>+ Nieuwe taak</button>}
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="toolbar">
        <select className="select-inline" value={fMonth} onChange={(e) => setFMonth(e.target.value)}>
          <option value="">Alle maanden</option>
          {PLAN_MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        {!template && (
          <select className="select-inline" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Alle statussen</option>
            {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
          </select>
        )}
        <input className="input-inline" placeholder="Zoeken…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="spacer" />
        {!template && STATUS_KEYS.map((k) => <span key={k} className="muted" title={STATUS[k].long}><StatusPill status={k} /> </span>)}
      </div>

      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        {loading ? <p className="muted" style={{ padding: 20 }}>Laden…</p> : filtered.length === 0 ? (
          <div className="empty-state">
            {items.length === 0 ? (isStaff && !template ? 'Nog geen taken. Pas het standaardplan toe of voeg een taak toe.' : 'Nog geen taken in het jaarplan.') : 'Geen taken die aan de filter voldoen.'}
          </div>
        ) : (
          <table className="plan-table">
            <thead>
              <tr>
                <th>Thema / onderwerp</th><th>Drempelwaarde</th>{!template && <th>Status</th>}<th>ROK</th>
                <th>Ontwikkelingsschaal</th>{!template && <th>Inschaling</th>}<th>Waar te vinden</th><th>Extra info / actie</th><th></th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <MonthRows key={g.month} g={g} template={template} refList={refList} refLabel={refLabel} onEdit={setEdit} onQuick={quickUpdate} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <PlanModal
          item={edit} template={template} canStructure={canStructure} questions={questions} roks={roks} refList={refList}
          scope={scope} year={year}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); }}
        />
      )}
    </div>
  );
}

function MonthRows({ g, template, refList, refLabel, onEdit, onQuick }) {
  return (
    <>
      <tr className="month-row"><td colSpan={template ? 7 : 9}>{monthLabel(g.month)}</td></tr>
      {g.rows.map((i) => {
        const auto = i.statusSource === 'auto';
        return (
          <tr key={i._id}>
            <td><strong>{i.theme || <span className="muted">(nog geen thema)</span>}</strong></td>
            <td>{i.threshold || '—'}{i.questionKey && i.thresholdValue !== null && i.statusMode === 'auto' && (
              <div className="muted" title="Gekoppeld aan de vragenlijst">{i.thresholdDirection === 'max' ? '≤' : '≥'} {i.thresholdValue}{i.linkedValue !== null && ` · nu ${i.linkedValue}`}</div>
            )}</td>
            {!template && (
              <td>
                <select className={`status-select ${i.status}`} value={i.status} disabled={auto} title={auto ? 'Automatisch bepaald op basis van de vragenlijst' : ''}
                  onChange={(e) => onQuick(i, { status: e.target.value })}>
                  {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
                </select>
                {auto && <div className="muted" style={{ fontSize: 11.5 }}>automatisch</div>}
              </td>
            )}
            <td>{[i.rok1, i.rok2].filter(Boolean).map((r) => <span className="tag" key={r}>{r}</span>)}</td>
            <td>{i.schaal ? refLabel('schaal', i.schaal).replace('Ontwikkelingsschaal ', 'OS ') : ''}{i.onderdeel && <div className="muted">{i.onderdeel}</div>}</td>
            {!template && (
              <td>
                <select className="select-inline" value={i.inschaling || ''} onChange={(e) => onQuick(i, { inschaling: e.target.value })}>
                  <option value="">—</option>
                  {refList('inschaling').map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </td>
            )}
            <td>{i.source || '—'}</td>
            <td style={{ maxWidth: 260 }}>{i.extraInfo}{i.action && <div><strong>Actie:</strong> {i.action}</div>}</td>
            <td><button className="btn btn-sm" onClick={() => onEdit(i)}>Bewerken</button></td>
          </tr>
        );
      })}
    </>
  );
}

function PlanModal({ item, template, canStructure, questions, roks, refList, scope, year, onClose, onSaved }) {
  const isNew = !item._id;
  const confirm = useConfirm();
  const [f, setF] = useState({ ...EMPTY, ...item, thresholdValue: item.thresholdValue ?? '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onderdelen = refList('onderdeel').filter((o) => !f.schaal || o.parent === f.schaal);
  const numericQs = questions.filter((q) => NUMERIC_TYPES.includes(q.answerType));
  const dis = !canStructure;

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const body = { ...f };
    ['_id', 'school', 'schoolYear', 'createdAt', 'updatedAt', '__v', 'statusSource', 'linkedValue'].forEach((k) => delete body[k]);
    try {
      if (isNew) await api.post('/plan', { ...body, school: scope, schoolYear: template ? undefined : year });
      else await api.put(`/plan/${item._id}`, body);
      onSaved();
    } catch (err) { setError(errMsg(err, 'Opslaan mislukt.')); setBusy(false); }
  }

  async function remove() {
    if (!(await confirm({ title: 'Taak verwijderen?', message: f.theme ? `"${f.theme}" wordt definitief verwijderd.` : 'Deze taak wordt definitief verwijderd.' }))) return;
    try { await api.delete(`/plan/${item._id}`); onSaved(); } catch (err) { setError(errMsg(err)); }
  }

  // valueKey: plan rows store the *label* for 'onderdeel' (as in the Excel), the *key* for the other lists
  const renderSel = (k, list, disabled, valueKey = 'key') => (
    <select value={f[k]} onChange={set(k)} disabled={disabled}>
      <option value="">—</option>
      {list.map((o) => <option key={o.key} value={o[valueKey]}>{o.label}</option>)}
    </select>
  );

  return (
    <Modal title={isNew ? 'Nieuwe taak' : 'Taak bewerken'} onClose={onClose} wide>
      <ErrorBanner message={error} />
      {!canStructure && <div className="sub-note">Je kan de status, inschaling, extra info en actie aanpassen. Thema, drempelwaarde en bron beheert je consultant.</div>}
      <form onSubmit={save}>
        <div className="field-row">
          <div className="field"><label>Maand</label>
            <select value={f.month} onChange={set('month')} disabled={dis}>{PLAN_MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
          </div>
          <div className="field"><label>Thema / onderwerp</label><input value={f.theme} onChange={set('theme')} disabled={dis} required={!template} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Drempelwaarde</label><input value={f.threshold} onChange={set('threshold')} disabled={dis} placeholder="bv. minstens 80% of max. 5 leerlingen" /></div>
          <div className="field"><label>Waar te vinden (bron)</label><input value={f.source} onChange={set('source')} disabled={dis} placeholder="bv. wisa, datawijzer, smartschool" /></div>
        </div>
        <div className="field-row-3">
          <div className="field"><label>ROK 1</label>{renderSel('rok1', roks, dis)}</div>
          <div className="field"><label>ROK 2</label>{renderSel('rok2', roks, dis)}</div>
          <div className="field"><label>Ontwikkelingsschaal</label>
            <select value={f.schaal} onChange={(e) => setF({ ...f, schaal: e.target.value, onderdeel: '' })} disabled={dis}>
              <option value="">—</option>{refList('schaal').map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Onderdeel ontwikkelingsschaal</label>{renderSel('onderdeel', onderdelen, dis, 'label')}</div>

        {!template && (
          <div className="field-row">
            <div className="field"><label>Status</label>
              <select value={f.status} onChange={set('status')} disabled={f.statusMode === 'auto' && !!f.questionKey}>
                {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].long}</option>)}
              </select>
            </div>
            <div className="field"><label>Inschaling</label>{renderSel('inschaling', refList('inschaling'), false)}</div>
          </div>
        )}
        <div className="field"><label>Extra info</label><textarea rows={2} value={f.extraInfo} onChange={set('extraInfo')} /></div>
        <div className="field"><label>Actie</label><textarea rows={2} value={f.action} onChange={set('action')} /></div>

        {canStructure && (
          <details style={{ marginBottom: 14 }} open={f.statusMode === 'auto'}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Status automatisch laten volgen uit de vragenlijst</summary>
            <div className="hint" style={{ margin: '6px 0 10px' }}>Koppel deze taak aan een cijfervraag en geef een drempelwaarde. Zodra er een antwoord is, wordt de status “ok” of “actie nodig”.</div>
            <div className="field"><label>Statusbepaling</label>
              <select value={f.statusMode} onChange={set('statusMode')}>
                <option value="manual">Handmatig</option><option value="auto">Automatisch op basis van vraag</option>
              </select>
            </div>
            {f.statusMode === 'auto' && (
              <>
                <div className="field"><label>Vraag</label>
                  <select value={f.questionKey} onChange={set('questionKey')}>
                    <option value="">Kies een vraag…</option>
                    {numericQs.map((qq) => <option key={qq.key} value={qq.key}>{monthLabel(qq.month)} · {qq.section} · {qq.text}</option>)}
                  </select>
                </div>
                <div className="field-row">
                  <div className="field"><label>Drempelwaarde (getal)</label><input type="number" step="any" value={f.thresholdValue} onChange={set('thresholdValue')} /></div>
                  <div className="field"><label>Ok als de waarde…</label>
                    <select value={f.thresholdDirection} onChange={set('thresholdDirection')}>
                      <option value="min">minstens de drempelwaarde is (≥)</option><option value="max">hoogstens de drempelwaarde is (≤)</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </details>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
          {!isNew && canStructure && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
        </div>
      </form>
    </Modal>
  );
}
