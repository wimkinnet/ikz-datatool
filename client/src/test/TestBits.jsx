import { useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { ErrorBanner } from '../components/Bits';
import { useConfirm } from '../components/Confirm';
import { formatDate } from '../utils/format';
import {
  PLAN_MONTHS, TEST_CATEGORIES, TEST_VALUE_TYPES, TEST_ACTION_STATUSES, testCategoryLabel, monthLabel,
} from '../utils/constants';

// ---------------------------------------------------------------- small display helpers
export function Beoordeling({ value, empty = '—' }) {
  if (value === 'groen') return <span className="verdict groen" title="Groen">groen</span>;
  if (value === 'rood') return <span className="verdict rood" title="Rood">rood</span>;
  return <span className="muted">{empty}</span>;
}

// Overall assessment of an operational goal (see test/assess.js)
export function GoalStatus({ a }) {
  const pct = a.ratio === null ? '' : ` · ${Math.round(a.ratio * 100)}% groen`;
  const title = a.total
    ? `${a.measured} van ${a.total} meetpunten beoordeeld (${a.groen} groen, ${a.rood} rood)${a.provisional ? ' - voorlopig' : ''}`
    : 'Koppel meetpunten aan de beoogde resultaten van dit doel';
  return (
    <span className={`status-pill ${a.cls}`} title={title}>
      {a.label}{pct}{a.provisional && <span className="provisional"> · voorlopig</span>}
    </span>
  );
}

export function CategoryTag({ category }) {
  return <span className={`cat-tag ${category}`}>{testCategoryLabel(category)}</span>;
}

export function formatValue(mp, value) {
  if (value === null || value === undefined || value === '') return '';
  if (mp.valueType === 'percentage') return `${String(value).replace('.', ',')}%`;
  if (mp.valueType === 'absoluut') return String(value).replace('.', ',');
  return String(value);
}

export function thresholdLabel(mp) {
  if (mp.valueType !== 'tekst' && mp.threshold !== null && mp.threshold !== undefined) {
    return `${mp.thresholdDirection === 'max' ? '≤' : '≥'} ${formatValue(mp, mp.threshold)}`;
  }
  return mp.thresholdText || '';
}

// Green/red suggested by a numeric threshold, or null when there is nothing to compare
export function suggestBeoordeling(mp, value) {
  if (mp.valueType === 'tekst' || mp.threshold === null || mp.threshold === undefined) return null;
  const n = Number(String(value ?? '').replace(',', '.'));
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) return null;
  const ok = mp.thresholdDirection === 'max' ? n <= mp.threshold : n >= mp.threshold;
  return ok ? 'groen' : 'rood';
}

// ---------------------------------------------------------------- pickers
export function RokPicker({ rok, value, onChange }) {
  const domains = [...new Set(rok.map((r) => r.domain))];
  const toggle = (code) => onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  return (
    <div className="rok-picker">
      {domains.map((d) => (
        <div key={d}>
          <div className="muted rok-domain">{d}</div>
          {rok.filter((r) => r.domain === d).map((r) => (
            <label key={r.code} className="checkbox-row" title={r.title}>
              <input type="checkbox" checked={value.includes(r.code)} onChange={() => toggle(r.code)} /> <strong>{r.code}</strong> <span className="muted">{r.title}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ResultPicker({ results, value, onChange }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div>
      <input type="search" placeholder="Zoek een beoogd resultaat…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 6 }} />
      <div className="rok-picker">
        {TEST_CATEGORIES.map((c) => {
          const list = results.filter((r) => r.category === c.key && (!term || r.name.toLowerCase().includes(term)));
          if (!list.length) return null;
          return (
            <div key={c.key}>
              <div className="muted rok-domain">{c.label}</div>
              {list.map((r) => (
                <label key={r._id} className="checkbox-row">
                  <input type="checkbox" checked={value.includes(r._id)} onChange={() => toggle(r._id)} /> {r.name}
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- operationeel doel
export function GoalModal({ goal, t, onClose }) {
  const confirm = useConfirm();
  const [f, setF] = useState({ title: '', description: '', rok: [], results: [], ...goal });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!f.results.length) { t.setError('Koppel minstens één beoogd resultaat.'); return; }
    setBusy(true);
    const body = { title: f.title, description: f.description, rok: f.rok, results: f.results };
    const ok = await t.run(() => (f._id
      ? api.put(`/test/goals/${f._id}`, body)
      : api.post('/test/goals', { ...body, school: t.schoolId, schoolYear: t.year })));
    setBusy(false);
    if (ok) onClose();
  }

  async function remove() {
    if (!(await confirm({ title: 'Doel verwijderen?', message: `"${f.title}" wordt verwijderd. De meetpunten, metingen en acties van de school blijven bewaard.` }))) return;
    if (await t.run(() => api.delete(`/test/goals/${f._id}`))) onClose();
  }

  return (
    <Modal title={f._id ? 'Operationeel doel bewerken' : `Nieuw operationeel doel (${t.year})`} onClose={onClose} wide>
      <ErrorBanner message={t.error} />
      <form onSubmit={submit}>
        <div className="field"><label>Operationeel doel</label><input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="field"><label>Toelichting</label><textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="field-row">
          <div className="field"><label>Draagt bij aan (ROK)</label><RokPicker rok={t.rok} value={f.rok} onChange={(rok) => setF({ ...f, rok })} /></div>
          <div className="field"><label>Beoogde resultaten</label><ResultPicker results={t.results} value={f.results} onChange={(results) => setF({ ...f, results })} /></div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
          {f._id && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- meetpunt (definition)
export function MeetpuntModal({ meetpunt, t, onClose }) {
  const confirm = useConfirm();
  const [f, setF] = useState({
    title: '', uitleg: '', bron: '', month: '', valueType: 'percentage', thresholdDirection: 'min', thresholdText: '', active: true,
    ...meetpunt, threshold: meetpunt.threshold ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const numeric = f.valueType !== 'tekst';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const body = {
      result: f.result, title: f.title, uitleg: f.uitleg, bron: f.bron, month: f.month, valueType: f.valueType,
      threshold: numeric ? f.threshold : '', thresholdDirection: f.thresholdDirection, thresholdText: f.thresholdText, active: f.active,
    };
    const ok = await t.run(() => (f._id ? api.put(`/test/meetpunten/${f._id}`, body) : api.post('/test/meetpunten', { ...body, school: t.schoolId })));
    setBusy(false);
    if (ok) onClose();
  }

  async function remove() {
    const metingen = t.metingen.filter((m) => m.meetpunt === f._id);
    const acties = t.actions.filter((a) => a.meetpunt === f._id);
    const open = acties.filter((a) => a.status !== 'afgerond').length;
    const linked = [
      metingen.length && `${metingen.length} meting${metingen.length === 1 ? '' : 'en'} (${metingen.map((m) => m.schoolYear).sort().join(', ')})`,
      acties.length && `${acties.length} actie${acties.length === 1 ? '' : 's'}${open ? `, waarvan ${open} nog niet afgerond` : ''}`,
    ].filter(Boolean);
    const ok = await confirm({
      title: 'Meetpunt verwijderen?',
      message: linked.length
        ? `"${f.title}" wordt definitief verwijderd, samen met:\n• ${linked.join('\n• ')}\n\nDe acties verdwijnen ook uit de actielijst. Dit kan niet ongedaan worden gemaakt. Wil je de historiek bewaren, zet het meetpunt dan op inactief.`
        : `"${f.title}" wordt definitief verwijderd.`,
      confirmLabel: linked.length ? 'Meetpunt en gekoppelde gegevens verwijderen' : 'Verwijderen',
    });
    if (!ok) return;
    if (await t.run(() => api.delete(`/test/meetpunten/${f._id}`, { params: { cascade: 1 } }))) onClose();
  }

  return (
    <Modal title={f._id ? 'Meetpunt bewerken' : 'Nieuw meetpunt'} onClose={onClose} wide>
      <ErrorBanner message={t.error} />
      <form onSubmit={submit}>
        <div className="field"><label>Beoogd resultaat</label>
          <select required value={f.result || ''} onChange={set('result')}>
            <option value="">Kies…</option>
            {TEST_CATEGORIES.map((c) => (
              <optgroup key={c.key} label={c.label}>
                {t.results.filter((r) => r.category === c.key).map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="field"><label>Meetpunt</label><input required value={f.title} onChange={set('title')} placeholder="bv. % leerlingen met AVI-niveau op leeftijd" /></div>
        <div className="field"><label>Uitleg</label><textarea rows={2} value={f.uitleg} onChange={set('uitleg')} /></div>
        <div className="field-row">
          <div className="field"><label>Bron</label><input value={f.bron} onChange={set('bron')} placeholder="bv. LVS, datawijzer, eigen bevraging" /></div>
          <div className="field"><label>Maand van evaluatie</label>
            <select value={f.month} onChange={set('month')}>
              <option value="">Geen maand</option>
              {PLAN_MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field"><label>Soort waarde</label>
            <select value={f.valueType} onChange={set('valueType')}>{TEST_VALUE_TYPES.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}</select>
          </div>
          {numeric ? (
            <div className="field"><label>Drempelwaarde (optioneel)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={f.thresholdDirection} onChange={set('thresholdDirection')} style={{ width: 'auto' }} aria-label="Richting">
                  <option value="min">minstens</option>
                  <option value="max">hoogstens</option>
                </select>
                <input inputMode="decimal" value={f.threshold} onChange={set('threshold')} placeholder={f.valueType === 'percentage' ? 'bv. 80' : 'bv. 25'} />
              </div>
              <div className="hint">Met een drempelwaarde stelt de tool groen of rood voor.</div>
            </div>
          ) : (
            <div className="field"><label>Drempelwaarde (optioneel)</label><input value={f.thresholdText} onChange={set('thresholdText')} /></div>
          )}
        </div>
        {f._id && <label className="checkbox-row" style={{ marginBottom: 14 }}><input type="checkbox" checked={f.active} onChange={set('active')} /> Actief (inactieve meetpunten bewaren hun historiek)</label>}
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
          {f._id && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- meting (one school year) + its actions
export function MetingModal({ meetpunt: mp, schoolYear, t, onClose }) {
  const existing = t.metingOf(mp._id, schoolYear);
  const [f, setF] = useState({ value: existing?.value ?? '', beoordeling: existing?.beoordeling || '', comment: existing?.comment || '' });
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null);
  const suggestion = suggestBeoordeling(mp, f.value);
  const actions = t.actionsOf(mp._id, schoolYear);

  function setValue(value) {
    // Follow the threshold's suggestion until the user picks green/red differently
    const prev = suggestBeoordeling(mp, f.value);
    const next = suggestBeoordeling(mp, value);
    setF({ ...f, value, beoordeling: !f.beoordeling || f.beoordeling === prev ? next || f.beoordeling : f.beoordeling });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await t.run(() => api.put('/test/metingen', { school: t.schoolId, meetpunt: mp._id, schoolYear, ...f }));
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal title={`${mp.title} · ${schoolYear}`} onClose={onClose} wide>
      <ErrorBanner message={t.error} />
      {mp.uitleg && <p className="muted" style={{ marginTop: 0 }}>{mp.uitleg}</p>}
      <p className="muted" style={{ marginTop: 0 }}>
        Bron: {mp.bron || '—'} · Evaluatie: {mp.month ? monthLabel(mp.month) : '—'}{thresholdLabel(mp) && ` · Drempelwaarde: ${thresholdLabel(mp)}`}
      </p>
      <form onSubmit={submit}>
        <div className="field-row">
          <div className="field"><label>Waarde{mp.valueType === 'percentage' ? ' (%)' : ''}</label>
            {mp.valueType === 'tekst'
              ? <textarea rows={2} value={f.value} onChange={(e) => setValue(e.target.value)} />
              : <input inputMode="decimal" value={f.value} onChange={(e) => setValue(e.target.value)} />}
          </div>
          <div className="field"><label>Beoordeling</label>
            <div className="verdict-pick">
              {['groen', 'rood'].map((v) => (
                <button type="button" key={v} className={`verdict ${v} ${f.beoordeling === v ? 'picked' : ''}`} onClick={() => setF({ ...f, beoordeling: f.beoordeling === v ? '' : v })}>{v}</button>
              ))}
            </div>
            {suggestion && <div className="hint">Volgens de drempelwaarde: {suggestion}.</div>}
          </div>
        </div>
        <div className="field"><label>Opmerking / analyse</label><textarea rows={2} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} /></div>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Meting opslaan'}</button>
      </form>

      <div className="meting-actions">
        <div className="tree-head">
          <h3 style={{ margin: 0 }}>Acties</h3>
          <span className="spacer" />
          <button className="btn btn-sm" onClick={() => setAction({ status: 'open' })}>+ Actie</button>
        </div>
        {actions.length === 0 ? <p className="muted">Nog geen acties voor dit meetresultaat.</p> : (
          <ul className="action-list">
            {actions.map((a) => (
              <li key={a._id}>
                <span className={`status-pill task-${a.status}`}>{TEST_ACTION_STATUSES.find((s) => s.key === a.status)?.label}</span>{' '}
                <button className="link-btn strong" onClick={() => setAction(a)}>{a.title}</button>
                <span className="muted">{a.owner && ` · ${a.owner}`}{a.dueDate && ` · tegen ${formatDate(a.dueDate)}`}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {action && <ActionModal action={action} meetpunt={mp} schoolYear={schoolYear} t={t} onClose={() => setAction(null)} />}
    </Modal>
  );
}

// ---------------------------------------------------------------- actie
export function ActionModal({ action, meetpunt, schoolYear, t, onClose }) {
  const confirm = useConfirm();
  const [f, setF] = useState({ title: '', description: '', owner: '', status: 'open', ...action, dueDate: action.dueDate ? action.dueDate.slice(0, 10) : '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const body = { title: f.title, description: f.description, owner: f.owner, dueDate: f.dueDate, status: f.status };
    const ok = await t.run(() => (f._id
      ? api.put(`/test/actions/${f._id}`, body)
      : api.post('/test/actions', { ...body, school: t.schoolId, meetpunt: meetpunt._id, schoolYear })));
    setBusy(false);
    if (ok) onClose();
  }

  async function remove() {
    if (!(await confirm({ title: 'Actie verwijderen?', message: `"${f.title}" wordt definitief verwijderd.` }))) return;
    if (await t.run(() => api.delete(`/test/actions/${f._id}`))) onClose();
  }

  return (
    <Modal title={f._id ? 'Actie bewerken' : 'Nieuwe actie'} onClose={onClose}>
      <ErrorBanner message={t.error} />
      <p className="muted" style={{ marginTop: 0 }}>Bij meetpunt "{meetpunt.title}" ({f.schoolYear || schoolYear})</p>
      <form onSubmit={submit}>
        <div className="field"><label>Actie</label><input required value={f.title} onChange={set('title')} /></div>
        <div className="field"><label>Beschrijving</label><textarea rows={2} value={f.description} onChange={set('description')} /></div>
        <div className="field-row">
          <div className="field"><label>Verantwoordelijke</label><input value={f.owner} onChange={set('owner')} placeholder="persoon of team" /></div>
          <div className="field"><label>Deadline</label><input type="date" value={f.dueDate} onChange={set('dueDate')} /></div>
        </div>
        <div className="field"><label>Status</label>
          <select value={f.status} onChange={set('status')}>{TEST_ACTION_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
          {f._id && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
        </div>
      </form>
    </Modal>
  );
}
