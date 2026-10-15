import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useSo } from '../../so/useSo';
import { InschalingSelect, IndicatorModal, RokTags } from '../../so/SoBits';
import { INSCHALING_SO, PLAN_MONTHS, SO_SOURCES } from '../../utils/constants';
import { useCollapse, Chevron, ToggleAll } from '../../components/Collapse';

// SO: the source tabs of the Kwaliteitsmonitor (Smartschool, Datawijzer, …). This is where indicators are rated.
export default function Indicatoren() {
  const { schoolId, school, year } = useApp();
  const { rok, rows, loading, error, save } = useSo();
  const [source, setSource] = useState('smartschool');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const rokByCode = useMemo(() => Object.fromEntries(rok.map((r) => [r.code, r])), [rok]);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = [];
    for (const r of rows.filter((x) => x.source === source).sort((a, b) => a.order - b.order)) {
      if (term && ![r.bron, r.text, r.threshold, r.action, r.group].join(' ').toLowerCase().includes(term)) continue;
      let g = out.find((x) => x.group === r.group);
      if (!g) out.push((g = { group: r.group, rows: [] }));
      g.rows.push(r);
    }
    return out;
  }, [rows, source, q]);

  // Sections fold to a header with a tally; searching opens every section with a match
  const c = useCollapse([]);
  const groupKey = (g) => `${source}:${g.group || '-'}`;
  const groupKeys = groups.map(groupKey);
  useEffect(() => { if (q.trim()) c.expand(groupKeys); }, [q, source]); // eslint-disable-line react-hooks/exhaustive-deps
  // A source with a single section (Datawijzer, Dataloep) opens it straight away
  useEffect(() => { if (groups.length === 1) c.expand(groupKeys); }, [source, groups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!schoolId) return <NoSchool />;
  const countFor = (key) => {
    const list = rows.filter((r) => r.source === key);
    return `${list.filter((r) => r.inschaling !== null).length}/${list.length}`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Indicatoren</h1>
          <p>Schaal elke indicator van {school?.name} ({year}) in per bron. De inschaling verschijnt meteen in het kwaliteitsbeeld en de kalender.</p>
        </div>
      </div>
      <ErrorBanner message={error} />

      <div className="month-tabs">
        {SO_SOURCES.map((s) => (
          <button key={s.key} className={`month-tab ${s.key === source ? 'active' : ''}`} onClick={() => setSource(s.key)}>
            {s.label}<small>{countFor(s.key)}</small>
          </button>
        ))}
      </div>
      {['vakwerkgroepen', 'llnbgl'].includes(source) && (
        <p className="muted" style={{ marginTop: -8 }}>Werkblad met eigen inschalingen; deze indicatoren zijn niet gekoppeld aan het ROK-kwaliteitsbeeld.</p>
      )}
      <div className="toolbar">
        <input className="input-inline" placeholder="Zoeken…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="spacer" />
        <ToggleAll c={c} keys={groupKeys} />
      </div>

      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        {loading ? <p className="muted" style={{ padding: 20 }}>Laden…</p> : groups.length === 0 ? (
          <div className="empty-state">Geen indicatoren{q ? ' die aan de zoekterm voldoen' : ' voor deze bron'}.</div>
        ) : (
          <table className="plan-table so-table">
            <thead>
              <tr><th>Bron</th><th>Indicator</th><th>Drempelwaarde</th><th>Inschaling</th><th>Moment</th><th>ROK</th><th>Opmerking / actie</th></tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRows key={g.group || '-'} g={g} open={c.isOpen(groupKey(g))} toggle={() => c.toggle(groupKey(g))} rokByCode={rokByCode} save={save} onEdit={setEdit} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && <IndicatorModal row={edit} rokByCode={rokByCode} error={error} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}

function GroupRows({ g, open, toggle, rokByCode, save, onEdit }) {
  const n = (v) => g.rows.filter((r) => r.inschaling === v).length;
  return (
    <>
      <tr className="month-row">
        <td colSpan={7}>
          <div className="tree-head">
            <button className="tree-toggle" onClick={toggle} aria-expanded={open}><Chevron open={open} /> {g.group || 'Indicatoren'}</button>
            <span className="tally">
              <span>{g.rows.length - n(null)}/{g.rows.length} ingeschaald</span>
              {INSCHALING_SO.map((i) => n(i.value) > 0 && <span key={i.value} className={`tally-dot ${i.cls}`} title={i.label}>{n(i.value)}</span>)}
            </span>
          </div>
        </td>
      </tr>
      {open && g.rows.map((r) => (
        <tr key={r.key}>
          <td>{r.bron}</td>
          <td><button className="link-btn strong" onClick={() => onEdit(r)}>{r.text}</button></td>
          <td>{r.threshold || '—'}{r.ownThreshold && <div className="muted" style={{ fontSize: 11.5 }}>eigen drempelwaarde</div>}</td>
          <td><InschalingSelect value={r.inschaling} onChange={(v) => save(r.key, { inschaling: v })} /></td>
          <td>
            <select className="select-inline" value={r.month || ''} aria-label="Monitoringsmoment"
              onChange={(e) => save(r.key, { month: e.target.value === r.defaultMonth ? '' : e.target.value })}>
              <option value="">—</option>
              {PLAN_MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </td>
          <td><RokTags codes={r.rok} rokByCode={rokByCode} /></td>
          <td style={{ maxWidth: 240 }}>
            <button className="link-btn" onClick={() => onEdit(r)}>{r.action || <span className="muted">+ toevoegen</span>}</button>
          </td>
        </tr>
      ))}
    </>
  );
}
