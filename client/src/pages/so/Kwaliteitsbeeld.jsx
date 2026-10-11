import { useMemo, useState } from 'react';
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
  const [open, setOpen] = useState({}); // expectation code -> description visible
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

  if (!schoolId) return <NoSchool />;
  const filtering = fSource || fMonth || fRating !== '' || q;

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
                <DomainRows key={d.domain} d={d} open={open} setOpen={setOpen} onEdit={setEdit} save={save} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && <IndicatorModal row={edit} rokByCode={rokByCode} error={error} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}

function DomainRows({ d, open, setOpen, onEdit, save }) {
  return (
    <>
      <tr className="month-row domain-row"><td colSpan={6}>{d.domain}</td></tr>
      {d.items.map(({ exp, inds }) => (
        <ExpectationRows key={exp.code} exp={exp} inds={inds} open={!!open[exp.code]}
          toggle={() => setOpen((o) => ({ ...o, [exp.code]: !o[exp.code] }))} onEdit={onEdit} save={save} />
      ))}
    </>
  );
}

function ExpectationRows({ exp, inds, open, toggle, onEdit, save }) {
  return (
    <>
      <tr className="exp-row">
        <td colSpan={6}>
          <span className="tag">{exp.code}</span> <strong>{exp.title}</strong>{' '}
          {exp.description && <button className="link-btn" onClick={toggle}>{open ? 'verberg toelichting' : 'toelichting'}</button>}
          {open && <p className="muted exp-desc">{exp.description}</p>}
        </td>
      </tr>
      {inds.map((r) => (
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

