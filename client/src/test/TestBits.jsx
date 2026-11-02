import { useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { ErrorBanner } from '../components/Bits';
import { useConfirm } from '../components/Confirm';
import { RESULT_LABEL, rokCode, signalCode, strategicCode } from './assess';
import {
  PLAN_MONTHS, TEST_CATEGORIES, currentSchoolYear, yearOptions, TEST_VALUE_TYPES, TEST_ACTION_STATUSES, testCategoryLabel,
} from '../utils/constants';

// ---------------------------------------------------------------- small display helpers
export function Beoordeling({ value, empty = '—' }) {
  if (RESULT_LABEL[value]) return <span className={`verdict ${value}`}>{RESULT_LABEL[value]}</span>;
  return <span className="muted">{empty}</span>;
}

// Overall assessment of an operational goal (see test/assess.js)
export function GoalStatus({ a }) {
  const pct = a.ratio === null ? '' : ` · ${Math.round(a.ratio * 100)}% op niveau`;
  const title = a.total
    ? `${a.done} van ${a.total} indicatoren ingevuld; resultaat: ${a.groen} op niveau, ${a.rood} onder niveau${a.zonder ? `, ${a.zonder} zonder beoordeling` : ''}${a.provisional ? ' (voorlopig)' : ''}`
    : 'Voeg indicatoren toe om het succes van dit doel te meten';
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
              <input type="checkbox" checked={value.includes(r.code)} onChange={() => toggle(r.code)} /> <strong>{rokCode(r.code)}</strong> <span className="muted">{r.title}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

// Optional links from an operational goal to signals or strategic goals
function CodePicker({ items, codeOf, value, onChange, empty }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  if (!items.length) return <p className="muted" style={{ margin: 0, fontSize: 13 }}>{empty}</p>;
  return (
    <div className="rok-picker">
      {items.map((i) => (
        <label key={i._id} className="checkbox-row">
          <input type="checkbox" checked={value.includes(i._id)} onChange={() => toggle(i._id)} /> <strong>{codeOf(i)}</strong> {i.title}
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- operationeel doel
function linkedText(t, goal) {
  const ind = t.indicatorsOf(goal._id).length;
  const act = t.actionsOf(goal._id).length;
  const with_ = [ind && `${ind} indicator${ind === 1 ? '' : 'en'}`, act && `${act} actie${act === 1 ? '' : 's'}`].filter(Boolean);
  return `"${goal.title}" wordt definitief verwijderd${with_.length ? `, samen met ${with_.join(' en ')}` : ''}. Dit kan niet ongedaan worden gemaakt.`;
}

export function GoalModal({ goal, t, onClose }) {
  const confirm = useConfirm();
  const [f, setF] = useState({ title: '', description: '', rok: [], signals: [], strategic: [], ...goal });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const body = { title: f.title, description: f.description, rok: f.rok, signals: f.signals, strategic: f.strategic };
    const ok = await t.run(() => (f._id
      ? api.put(`/test/goals/${f._id}`, body)
      : api.post('/test/goals', { ...body, school: t.schoolId, schoolYear: t.year })));
    setBusy(false);
    if (ok) onClose();
  }

  async function remove() {
    if (!(await confirm({ title: 'Doel verwijderen?', message: linkedText(t, f) }))) return;
    if (await t.run(() => api.delete(`/test/goals/${f._id}`))) onClose();
  }

  return (
    <Modal title={f._id ? 'Operationeel doel bewerken' : `Nieuw operationeel doel (${t.year})`} onClose={onClose} wide>
      <ErrorBanner message={t.error} />
      <form onSubmit={submit}>
        <div className="field"><label>Operationeel doel</label><input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="field"><label>Toelichting</label><textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="field"><label>Draagt bij aan (ROK)</label><RokPicker rok={t.rok} value={f.rok} onChange={(rok) => setF({ ...f, rok })} /></div>
        <div className="field-row">
          <div className="field"><label>Draagt bij aan signalen (optioneel)</label>
            <CodePicker items={t.signals} codeOf={signalCode} value={f.signals} onChange={(signals) => setF({ ...f, signals })} empty="Nog geen signalen voor deze school." />
          </div>
          <div className="field"><label>Draagt bij aan strategische doelen (optioneel)</label>
            <CodePicker items={t.strategic} codeOf={strategicCode} value={f.strategic} onChange={(strategic) => setF({ ...f, strategic })} empty="Nog geen strategische doelen voor deze school." />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
          {f._id && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- signaal (consultants and admins)
const NEW_DOMAIN = '__new';

export function SignalModal({ signal, t, onClose }) {
  const confirm = useConfirm();
  const [f, setF] = useState({ title: '', description: '', domain: '', measure: '', valueType: 'percentage', startYear: currentSchoolYear(), ...signal, startValue: signal.startValue ?? '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const [newDomain, setNewDomain] = useState(null); // { name, category } while adding a domein

  function chooseDomain(e) {
    if (e.target.value === NEW_DOMAIN) { t.setError(''); setNewDomain({ name: '', category: '' }); return; }
    setNewDomain(null);
    setF({ ...f, domain: e.target.value });
  }

  async function addDomain() {
    if (!newDomain.name.trim() || !newDomain.category) { t.setError('Geef het nieuwe domein een naam en een categorie.'); return; }
    let created;
    const ok = await t.run(async () => { created = (await api.post('/test/results', newDomain)).data; });
    if (!ok) return;
    t.addResult(created);
    setF((prev) => ({ ...prev, domain: created._id }));
    setNewDomain(null);
  }

  async function submit(e) {
    e.preventDefault();
    if (newDomain) { t.setError('Voeg het nieuwe domein eerst toe, of kies een bestaand domein.'); return; }
    setBusy(true);
    const body = { title: f.title, description: f.description, domain: f.domain, measure: f.measure, valueType: f.valueType, startValue: f.startValue, startYear: f.startYear };
    const ok = await t.run(() => (f._id ? api.put(`/test/signals/${f._id}`, body) : api.post('/test/signals', { ...body, school: t.schoolId })));
    setBusy(false);
    if (ok) onClose();
  }

  async function remove() {
    const linked = t.allGoals.filter((g) => g.signals?.includes(f._id)).length;
    const ok = await confirm({
      title: 'Signaal verwijderen?',
      message: `"${f.title}" wordt definitief verwijderd.${linked ? `\n\n${linked} ${linked === 1 ? 'operationeel doel is' : 'operationele doelen zijn'} eraan gekoppeld; die koppeling verdwijnt, de doelen blijven bestaan.` : ''}`,
    });
    if (ok && (await t.run(() => api.delete(`/test/signals/${f._id}`)))) onClose();
  }

  return (
    <Modal title={f._id ? `${signalCode(f)} bewerken` : 'Nieuw signaal'} onClose={onClose} wide>
      <ErrorBanner message={t.error} />
      <form onSubmit={submit}>
        <div className="field"><label>Titel</label><input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="field"><label>Beschrijving</label><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="field"><label>Domein</label>
          <select required value={newDomain ? NEW_DOMAIN : f.domain} onChange={chooseDomain}>
            <option value="">Kies een domein…</option>
            {TEST_CATEGORIES.map((c) => (
              <optgroup key={c.key} label={c.label}>
                {t.results.filter((r) => r.category === c.key).map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
              </optgroup>
            ))}
            <option value={NEW_DOMAIN}>+ Nieuw domein…</option>
          </select>
          {newDomain && (
            <div className="new-domain">
              <div className="field-row">
                <div className="field"><label>Naam van het nieuwe domein</label>
                  <input autoFocus value={newDomain.name} onChange={(e) => setNewDomain({ ...newDomain, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }} />
                </div>
                <div className="field"><label>Categorie</label>
                  <select value={newDomain.category} onChange={(e) => setNewDomain({ ...newDomain, category: e.target.value })}>
                    <option value="">Kies een categorie…</option>
                    {TEST_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="new-domain-actions">
                <button type="button" className="btn btn-sm" onClick={addDomain}>Domein toevoegen</button>
                <button type="button" className="link-btn" onClick={() => setNewDomain(null)}>Annuleren</button>
                <span className="muted">Het domein wordt zichtbaar voor alle scholen.</span>
              </div>
            </div>
          )}
          <div className="hint">De categorie van het domein bepaalt de code: C (context), P (proces) of R (resultaten).{f._id && ' Kies je een domein uit een andere categorie, dan krijgt het signaal een nieuwe code.'}</div>
        </div>
        <div className="field"><label>Wat wordt gemeten?</label><input required value={f.measure} onChange={set('measure')} placeholder="bv. aantal leerlingen met ongewettigde afwezigheid" /></div>
        <div className="field-row">
          <div className="field"><label>Soort waarde</label>
            <select value={f.valueType} onChange={set('valueType')}>{TEST_VALUE_TYPES.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}</select>
          </div>
          <div className="field"><label>Schooljaar van de startwaarde</label>
            <select value={f.startYear} onChange={set('startYear')}>
              <option value="">Geen schooljaar</option>
              {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Startwaarde{f.valueType === 'percentage' ? ' (%)' : ''}</label>
          {f.valueType === 'tekst'
            ? <textarea rows={2} value={f.startValue} onChange={set('startValue')} />
            : <input inputMode="decimal" value={f.startValue} onChange={set('startValue')} />}
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
          {f._id && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- strategisch doel (consultants and admins)
export function StrategicModal({ goal, t, onClose }) {
  const confirm = useConfirm();
  const [f, setF] = useState({ title: '', description: '', ...goal });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const body = { title: f.title, description: f.description };
    const ok = await t.run(() => (f._id ? api.put(`/test/strategic/${f._id}`, body) : api.post('/test/strategic', { ...body, school: t.schoolId })));
    setBusy(false);
    if (ok) onClose();
  }

  async function remove() {
    const linked = t.allGoals.filter((g) => g.strategic?.includes(f._id)).length;
    const ok = await confirm({
      title: 'Strategisch doel verwijderen?',
      message: `"${f.title}" wordt definitief verwijderd.${linked ? `\n\n${linked} ${linked === 1 ? 'operationeel doel is' : 'operationele doelen zijn'} eraan gekoppeld; die koppeling verdwijnt, de doelen blijven bestaan.` : ''}`,
    });
    if (ok && (await t.run(() => api.delete(`/test/strategic/${f._id}`)))) onClose();
  }

  return (
    <Modal title={f._id ? `${strategicCode(f)} bewerken` : 'Nieuw strategisch doel'} onClose={onClose}>
      <ErrorBanner message={t.error} />
      <form onSubmit={submit}>
        <div className="field"><label>Titel</label><input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="field"><label>Beschrijving</label><textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
          {f._id && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- meetpunt (indicator or meetpunt of an action)
const EMPTY_MEETPUNT = { title: '', uitleg: '', bron: '', month: '', valueType: 'percentage', threshold: '', thresholdDirection: 'min', thresholdText: '', value: '', beoordeling: '', comment: '' };
const meetpuntForm = (m) => ({ ...EMPTY_MEETPUNT, ...m, threshold: m?.threshold ?? '', value: m?.value ?? '', beoordeling: m?.beoordeling || '' });

// Definition and measurement fields, shared by the indicator dialog and the action dialog
function MeetpuntFields({ f, setF, nameLabel, namePlaceholder }) {
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const numeric = f.valueType !== 'tekst';
  const suggestion = suggestBeoordeling(f, f.value);

  function setValue(value) {
    // Follow the threshold's suggestion until the user picks a result differently
    const prev = suggestBeoordeling(f, f.value);
    const next = suggestBeoordeling(f, value);
    setF({ ...f, value, beoordeling: !f.beoordeling || f.beoordeling === prev ? next || f.beoordeling : f.beoordeling });
  }

  return (
    <>
      <div className="field"><label>{nameLabel}</label><input required value={f.title} onChange={set('title')} placeholder={namePlaceholder} /></div>
      <div className="field"><label>Uitleg</label><textarea rows={2} value={f.uitleg} onChange={set('uitleg')} /></div>
      <div className="field-row">
        <div className="field"><label>Bron</label><input value={f.bron} onChange={set('bron')} placeholder="bv. Smartschool, leerlingvolgsysteem" /></div>
        <div className="field"><label>Moment van de meting</label>
          <select required value={f.month} onChange={set('month')}>
            <option value="">Kies een maand…</option>
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
              <input inputMode="decimal" value={f.threshold} onChange={set('threshold')} />
            </div>
          </div>
        ) : (
          <div className="field"><label>Drempelwaarde (optioneel)</label><input value={f.thresholdText} onChange={set('thresholdText')} /></div>
        )}
      </div>
      <div className="field-row">
        <div className="field"><label>Gemeten waarde{f.valueType === 'percentage' ? ' (%)' : ''}</label>
          {numeric
            ? <input inputMode="decimal" value={f.value} onChange={(e) => setValue(e.target.value)} />
            : <textarea rows={2} value={f.value} onChange={(e) => setValue(e.target.value)} />}
        </div>
        <div className="field"><label>Resultaat</label>
          <div className="verdict-pick">
            {['groen', 'rood'].map((v) => (
              <button type="button" key={v} className={`verdict ${v} ${f.beoordeling === v ? 'picked' : ''}`} onClick={() => setF({ ...f, beoordeling: f.beoordeling === v ? '' : v })}>{RESULT_LABEL[v]}</button>
            ))}
          </div>
          {suggestion && <div className="hint">Volgens de drempelwaarde: {RESULT_LABEL[suggestion].toLowerCase()}.</div>}
        </div>
      </div>
      <div className="field"><label>Opmerking / analyse</label><textarea rows={2} value={f.comment} onChange={set('comment')} /></div>
    </>
  );
}

const meetpuntBody = (f) => {
  const { title, uitleg, bron, month, valueType, thresholdDirection, thresholdText, value, beoordeling, comment } = f;
  return { title, uitleg, bron, month, valueType, thresholdDirection, thresholdText, value, beoordeling, comment, threshold: valueType === 'tekst' ? '' : f.threshold };
};

// ---------------------------------------------------------------- indicator of an operational goal
export function IndicatorModal({ indicator, goal, t, onClose }) {
  const confirm = useConfirm();
  const [f, setF] = useState(() => meetpuntForm(indicator));
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await t.run(() => (f._id
      ? api.put(`/test/meetpunten/${f._id}`, meetpuntBody(f))
      : api.post('/test/meetpunten', { ...meetpuntBody(f), school: t.schoolId, goal: goal._id })));
    setBusy(false);
    if (ok) onClose();
  }

  async function remove() {
    if (!(await confirm({ title: 'Indicator verwijderen?', message: `"${f.title}" en de meting ervan worden definitief verwijderd.` }))) return;
    if (await t.run(() => api.delete(`/test/meetpunten/${f._id}`))) onClose();
  }

  return (
    <Modal title={f._id ? 'Indicator bewerken' : 'Nieuwe indicator'} onClose={onClose} wide>
      <ErrorBanner message={t.error} />
      <p className="muted" style={{ marginTop: 0 }}>Meet het succes van "{goal.title}" ({goal.schoolYear})</p>
      <form onSubmit={submit}>
        <MeetpuntFields f={f} setF={setF} nameLabel="Indicator" namePlaceholder="bv. aantal leerlingen met ongewettigde afwezigheid" />
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
          {f._id && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- actie of an operational goal
export function ActionModal({ action, t, onClose }) {
  const confirm = useConfirm();
  const [f, setF] = useState({ title: '', description: '', owner: '', goal: '', status: 'in_te_plannen', ...action, dueDate: action.dueDate ? action.dueDate.slice(0, 10) : '' });
  const existing = action._id ? t.meetpuntOfAction(action._id) : null;
  const [hasMeetpunt, setHasMeetpunt] = useState(!!existing);
  const [mp, setMp] = useState(() => meetpuntForm(existing));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  // Goals of the same school year as the action
  const year = t.goalById[f.goal]?.schoolYear || t.year;
  const options = t.allGoals.filter((g) => g.schoolYear === year);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const body = { goal: f.goal, title: f.title, description: f.description, owner: f.owner, dueDate: f.dueDate, status: f.status, meetpunt: hasMeetpunt ? meetpuntBody(mp) : null };
    const ok = await t.run(() => (f._id ? api.put(`/test/actions/${f._id}`, body) : api.post('/test/actions', { ...body, school: t.schoolId })));
    setBusy(false);
    if (ok) onClose();
  }

  async function remove() {
    if (!(await confirm({ title: 'Actie verwijderen?', message: `"${f.title}"${existing ? ' en het meetpunt ervan worden' : ' wordt'} definitief verwijderd.` }))) return;
    if (await t.run(() => api.delete(`/test/actions/${f._id}`))) onClose();
  }

  return (
    <Modal title={f._id ? 'Actie bewerken' : 'Nieuwe actie'} onClose={onClose} wide>
      <ErrorBanner message={t.error} />
      <form onSubmit={submit}>
        <div className="field"><label>Operationeel doel</label>
          <select required value={f.goal} onChange={set('goal')}>
            <option value="">Kies een operationeel doel…</option>
            {options.map((g) => <option key={g._id} value={g._id}>{g.title}</option>)}
          </select>
        </div>
        <div className="field"><label>Actie</label><input required value={f.title} onChange={set('title')} placeholder="bv. gratis maaltijden aanbieden over de middag" /></div>
        <div className="field"><label>Beschrijving</label><textarea rows={2} value={f.description} onChange={set('description')} /></div>
        <div className="field-row">
          <div className="field"><label>Status</label>
            <select required value={f.status} onChange={set('status')}>{TEST_ACTION_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
          </div>
          <div className="field"><label>Verantwoordelijke</label><input value={f.owner} onChange={set('owner')} placeholder="persoon of team" /></div>
        </div>
        <div className="field"><label>Deadline</label><input type="date" value={f.dueDate} onChange={set('dueDate')} /></div>
        <label className="checkbox-row" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={hasMeetpunt} onChange={(e) => setHasMeetpunt(e.target.checked)} /> Het succes van deze actie meten met een meetpunt
        </label>
        {hasMeetpunt && (
          <div className="action-meetpunt">
            <MeetpuntFields f={mp} setF={setMp} nameLabel="Meetpunt" namePlaceholder="bv. aantal leerlingen dat over de middag op school eet" />
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
          {f._id && <button type="button" className="btn btn-danger" onClick={remove}>Verwijderen</button>}
        </div>
      </form>
    </Modal>
  );
}
