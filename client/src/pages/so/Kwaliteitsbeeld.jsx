import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useSo } from '../../so/useSo';
import { InschalingSelect, IndicatorModal } from '../../so/SoBits';
import { INSCHALING_SO, PLAN_MONTHS, SO_SOURCES, monthLabel, monthIdx, soSourceLabel } from '../../utils/constants';

// SO: the ROK view of the Kwaliteitsmonitor. Every ROK expectation with the indicators that give evidence
// for it; an indicator is rated once and shows up under every expectation it is linked to.
export default function Kwaliteitsbeeld() {
  const { schoolId, school, year } = useApp();
  const { rok, rows, loading, error, save } = useSo();
  const [fSource, setFSource] = useState('');
  const [fMonth, setFMonth] = useState('');
  const [fRating, setFRating] = useState('');
  const [q, setQ] = useState('');
  const [desc, setDesc] = useState({}); // expectation code -> description visible
  // Collapsible tree: black domain rows -> expectation rows (R1, K2, …) -> indicator rows
  const [openDomains, setOpenDomains] = useState(() => new Set());
  const [openExps, setOpenExps] = useState(() => new Set());
  const [edit, setEdit] = useState(null);

  const rokByCode = useMemo(() => Object.fromEntries(rok.map((r) => [r.code, r])), [rok]);
  const linked = useMemo(() => rows.filter((r) => r.rok.length), [rows]);

  const counts = useMemo(() => {
    const c = { total: linked.length, 1: 0, 0: 0, '-1': 0, none: 0, actions: 0 };
    for (const r of linked) {
      c[r.inschaling === null ? 'none' : r.inschaling]++;
      if (r.action) c.actions++;
    }
    return c;
  }, [linked]);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (r) =>
      (!fSource || r.source === fSource) &&
      (!fMonth || r.month === fMonth) &&
      (fRating === '' || (fRating === 'none' ? r.inschaling === null : r.inschaling === Number(fRating))) &&
      (!term || [r.bron, r.text, r.threshold, r.action].join(' ').toLowerCase().includes(term));
  }, [fSource, fMonth, fRating, q]);

  // domain -> expectations -> matching indicators (sorted by month, then source order)
  const domains = useMemo(() => {
    const out = [];
    for (const exp of rok) {
      const inds = linked.filter((r) => r.rok.includes(exp.code) && matches(r))
        .sort((a, b) => monthIdx(a.month) - monthIdx(b.month) || a.order - b.order);
      if (!inds.length) continue;
      let d = out.find((x) => x.domain === exp.domain);
      if (!d) out.push((d = { domain: exp.domain, items: [] }));
      d.items.push({ exp, inds });
    }
    return out;
  }, [rok, linked, matches]);

  const filtering = fSource || fMonth || fRating !== '' || q;

  const toggle = (setter, key) => setter((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  function expandAll(list = domains) {
    setOpenDomains((prev) => new Set([...prev, ...list.map((d) => d.domain)]));
    setOpenExps((prev) => new Set([...prev, ...list.flatMap((d) => d.items.map((i) => i.exp.code))]));
  }
  function collapseAll(list = domains) {
    const names = new Set(list.map((d) => d.domain));
    const codes = new Set(list.flatMap((d) => d.items.map((i) => i.exp.code)));
    setOpenDomains((prev) => new Set([...prev].filter((x) => !names.has(x))));
    setOpenExps((prev) => new Set([...prev].filter((x) => !codes.has(x))));
  }
  const allOpen = (list) => list.every((d) => openDomains.has(d.domain) && d.items.every((i) => openExps.has(i.exp.code)));

  // A new filter opens everything that still matches, so the results are visible straight away
  useEffect(() => {
    if (filtering) expandAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fSource, fMonth, fRating, q]);

  if (!schoolId) return <NoSchool />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Kwaliteitsbeeld</h1>
          <p>Een actueel kwaliteitsbeeld van {school?.name} ({year}) op basis van alle gemonitorde indicatoren, per verwachting van het ROK.</p>
        </div>
      </div>
      <ErrorBanner message={error} />

      <div className="stat-grid">
        <div className="stat"><div className="label">Indicatoren</div><div className="value">{counts.total}</div></div>
        {INSCHALING_SO.map((i) => (
          <button key={i.value} className={`stat stat-btn ${fRating === String(i.value) ? 'active' : ''}`} onClick={() => setFRating(fRating === String(i.value) ? '' : String(i.value))}>
            <div className="label">{i.label}</div><div className={`value st-${i.cls}`}>{counts[i.value]}</div>
          </button>
        ))}
        <button className={`stat stat-btn ${fRating === 'none' ? 'active' : ''}`} onClick={() => setFRating(fRating === 'none' ? '' : 'none')}>
          <div className="label">Nog niet ingeschaald</div><div className="value muted">{counts.none}</div>
        </button>
        <div className="stat"><div className="label">Acties genoteerd</div><div className="value">{counts.actions}</div></div>
      </div>

      <div className="toolbar">
        <select className="select-inline" value={fSource} onChange={(e) => setFSource(e.target.value)}>
          <option value="">Alle bronnen</option>
          {SO_SOURCES.filter((s) => linked.some((r) => r.source === s.key)).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className="select-inline" value={fMonth} onChange={(e) => setFMonth(e.target.value)}>
          <option value="">Alle monitoringsmomenten</option>
          {PLAN_MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <select className="select-inline" value={fRating} onChange={(e) => setFRating(e.target.value)}>
          <option value="">Alle inschalingen</option>
          {INSCHALING_SO.map((i) => <option key={i.value} value={String(i.value)}>{i.label}</option>)}
          <option value="none">Nog niet ingeschaald</option>
        </select>
        <input className="input-inline" placeholder="Zoeken…" value={q} onChange={(e) => setQ(e.target.value)} />
        {filtering && <button className="btn btn-sm" onClick={() => { setFSource(''); setFMonth(''); setFRating(''); setQ(''); }}>Filters wissen</button>}
        <span className="spacer" />
        {domains.length > 0 && (allOpen(domains)
          ? <button className="btn btn-sm" onClick={() => collapseAll()}>Alles inklappen</button>
          : <button className="btn btn-sm" onClick={() => expandAll()}>Alles uitklappen</button>)}
      </div>

      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        {loading ? <p className="muted" style={{ padding: 20 }}>Laden…</p> : domains.length === 0 ? (
          <div className="empty-state">{filtering ? 'Geen indicatoren die aan de filter voldoen.' : 'Nog geen indicatoren gekoppeld aan het ROK.'}</div>
        ) : (
          <table className="plan-table so-table">
            <thead>
              <tr><th>Bron</th><th>Wat meten?</th><th>Drempelwaarde</th><th>Inschaling</th><th>Moment</th><th>Opmerking / actie</th></tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <DomainRows key={d.domain} d={d} isOpen={openDomains.has(d.domain)} openExps={openExps}
                  toggleDomain={() => toggle(setOpenDomains, d.domain)} toggleExp={(code) => toggle(setOpenExps, code)}
                  allOpen={allOpen([d])} expandAll={() => expandAll([d])} collapseAll={() => collapseAll([d])}
                  desc={desc} toggleDesc={(code) => setDesc((o) => ({ ...o, [code]: !o[code] }))} onEdit={setEdit} save={save} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && <IndicatorModal row={edit} rokByCode={rokByCode} error={error} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}

// Small per-rating tally shown on collapsed rows (an indicator linked twice in one domain counts once)
function Tally({ inds }) {
  const unique = [...new Map(inds.map((r) => [r.key, r])).values()];
  const n = (v) => unique.filter((r) => r.inschaling === v).length;
  return (
    <span className="tally">
      <span>{unique.length} indicator{unique.length === 1 ? '' : 'en'}</span>
      {INSCHALING_SO.map((i) => n(i.value) > 0 && <span key={i.value} className={`tally-dot ${i.cls}`} title={i.label}>{n(i.value)}</span>)}
      {n(null) > 0 && <span className="tally-dot none" title="Nog niet ingeschaald">{n(null)}</span>}
    </span>
  );
}

function DomainRows({ d, isOpen, openExps, toggleDomain, toggleExp, allOpen, expandAll, collapseAll, desc, toggleDesc, onEdit, save }) {
  return (
    <>
      <tr className="month-row domain-row">
        <td colSpan={6}>
          <div className="tree-head">
            <button className="tree-toggle" onClick={toggleDomain} aria-expanded={isOpen}>
              <span className={`chev ${isOpen ? 'open' : ''}`}>▸</span> {d.domain}
            </button>
            <Tally inds={d.items.flatMap((i) => i.inds)} />
            <span className="spacer" />
            <button className="btn btn-sm tree-all" onClick={allOpen ? collapseAll : expandAll}>{allOpen ? 'Alles inklappen' : 'Alles uitklappen'}</button>
          </div>
        </td>
      </tr>
      {isOpen && d.items.map(({ exp, inds }) => (
        <ExpectationRows key={exp.code} exp={exp} inds={inds} isOpen={openExps.has(exp.code)} toggle={() => toggleExp(exp.code)}
          showDesc={!!desc[exp.code]} toggleDesc={() => toggleDesc(exp.code)} onEdit={onEdit} save={save} />
      ))}
    </>
  );
}

function ExpectationRows({ exp, inds, isOpen, toggle, showDesc, toggleDesc, onEdit, save }) {
  return (
    <>
      <tr className="exp-row">
        <td colSpan={6}>
          <div className="tree-head">
            <button className="tree-toggle" onClick={toggle} aria-expanded={isOpen}>
              <span className={`chev ${isOpen ? 'open' : ''}`}>▸</span> <span className="tag">{exp.code}</span> <strong>{exp.title}</strong>
            </button>
            <Tally inds={inds} />
          </div>
          {exp.description && <button className="link-btn exp-desc-btn" onClick={toggleDesc}>{showDesc ? 'verberg toelichting' : 'toelichting'}</button>}
          {showDesc && <p className="muted exp-desc">{exp.description}</p>}
        </td>
      </tr>
      {isOpen && inds.map((r) => (
        <tr key={r.key}>
          <td><span className="muted">{soSourceLabel(r.source)}</span><div>{r.bron}</div></td>
          <td><button className="link-btn strong" onClick={() => onEdit(r)}>{r.text}</button></td>
          <td>{r.threshold || '—'}</td>
          <td><InschalingSelect value={r.inschaling} onChange={(v) => save(r.key, { inschaling: v })} /></td>
          <td>{r.month ? monthLabel(r.month) : '—'}</td>
          <td style={{ maxWidth: 240 }}>{r.action || <span className="muted">—</span>}</td>
        </tr>
      ))}
    </>
  );
}
