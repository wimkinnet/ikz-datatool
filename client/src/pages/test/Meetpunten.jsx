import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { Beoordeling, MeetpuntModal, MetingModal, formatValue, thresholdLabel } from '../../test/TestBits';
import { useCollapse, Chevron, ToggleAll } from '../../components/Collapse';
import { FIRST_GOAL_YEAR, FIRST_MEASURE_YEAR, TEST_CATEGORIES, monthLabel, yearsBetween } from '../../utils/constants';

// Test: the school's meetpunten per category and beoogd resultaat, with one column per school year
// (from 2024-2025 up to the active year) so the history is visible next to this year's measurement.
export default function Meetpunten() {
  const { school } = useApp();
  const t = useTest();
  const [showAll, setShowAll] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [meetpunt, setMeetpunt] = useState(null);
  const [meting, setMeting] = useState(null); // { meetpunt, schoolYear }

  const years = yearsBetween(FIRST_MEASURE_YEAR, t.year > FIRST_MEASURE_YEAR ? t.year : FIRST_MEASURE_YEAR);
  const inGoals = useMemo(() => new Set(t.goals.flatMap((g) => g.results)), [t.goals]);

  const categories = useMemo(() => TEST_CATEGORIES.map((c) => ({
    ...c,
    results: t.results
      .filter((r) => r.category === c.key)
      .map((r) => ({ ...r, meetpunten: t.meetpunten.filter((m) => m.result === r._id && (showInactive || m.active)) }))
      .filter((r) => showAll || r.meetpunten.length || inGoals.has(r._id)),
  })).filter((c) => c.results.length), [t.results, t.meetpunten, inGoals, showAll, showInactive]);

  // Categories start open, beoogde resultaten folded (their row shows a tally of their meetpunten)
  const c = useCollapse(() => TEST_CATEGORIES.map((x) => `c:${x.key}`), true);
  const allKeys = [...categories.map((x) => `c:${x.key}`), ...categories.flatMap((x) => x.results.map((r) => r._id))];

  if (!t.schoolId) return <NoSchool />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Meetpunten</h1>
          <p>De meetpunten van {school?.name} per beoogd resultaat, met de metingen vanaf {FIRST_MEASURE_YEAR}. Klik op een meting om ze in te vullen of acties toe te voegen.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { t.setError(''); setMeetpunt({}); }}>+ Nieuw meetpunt</button>
      </div>
      <ErrorBanner message={!meetpunt && !meting ? t.error : ''} />
      <div className="toolbar">
        <label className="checkbox-row" style={{ margin: 0 }}>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Alle beoogde resultaten tonen
        </label>
        <label className="checkbox-row" style={{ margin: 0 }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Inactieve meetpunten tonen
        </label>
        <span className="spacer" />
        <ToggleAll c={c} keys={allKeys} />
      </div>

      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        {t.loading ? <p className="muted" style={{ padding: 20 }}>Laden…</p> : categories.length === 0 ? (
          <div className="empty-state">
            Nog geen meetpunten. {t.year >= FIRST_GOAL_YEAR ? 'Koppel beoogde resultaten aan een operationeel doel, of ' : ''}vink "Alle beoogde resultaten tonen" aan om meetpunten toe te voegen.
          </div>
        ) : (
          <table className="plan-table so-table">
            <thead>
              <tr>
                <th>Meetpunt</th><th>Bron</th><th>Evaluatie</th><th>Drempelwaarde</th>
                {years.map((y) => <th key={y} className={y === t.year ? 'year-current' : ''}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <CategoryRows key={cat.key} cat={cat} col={c} years={years} t={t} inGoals={inGoals}
                  onAdd={(rid) => { t.setError(''); setMeetpunt({ result: rid }); }}
                  onEdit={(m) => { t.setError(''); setMeetpunt(m); }}
                  onMeting={(m, y) => { t.setError(''); setMeting({ meetpunt: m, schoolYear: y }); }} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meetpunt && <MeetpuntModal meetpunt={meetpunt} t={t} onClose={() => setMeetpunt(null)} />}
      {meting && <MetingModal meetpunt={meting.meetpunt} schoolYear={meting.schoolYear} t={t} onClose={() => setMeting(null)} />}
    </div>
  );
}

function CategoryRows({ cat, col, years, t, inGoals, onAdd, onEdit, onMeting }) {
  const cols = 4 + years.length;
  const key = `c:${cat.key}`;
  const open = col.isOpen(key);
  const count = cat.results.reduce((n, r) => n + r.meetpunten.length, 0);
  return (
    <>
      <tr className="month-row domain-row">
        <td colSpan={cols}>
          <div className="tree-head">
            <button className="tree-toggle" onClick={() => col.toggle(key)} aria-expanded={open}><Chevron open={open} /> {cat.label}</button>
            <span className="tally">{cat.results.length} beoogde resultaten · {count} meetpunt{count === 1 ? '' : 'en'}</span>
            <span className="spacer" />
            <ToggleAll c={col} keys={[key, ...cat.results.map((r) => r._id)]} className="btn btn-sm tree-all" />
          </div>
        </td>
      </tr>
      {open && cat.results.map((r) => (
        <ResultRows key={r._id} r={r} open={col.isOpen(r._id)} toggle={() => col.toggle(r._id)} cols={cols} years={years} t={t}
          linked={inGoals.has(r._id)} onAdd={onAdd} onEdit={onEdit} onMeting={onMeting} />
      ))}
    </>
  );
}

function ResultRows({ r, open, toggle, cols, years, t, linked, onAdd, onEdit, onMeting }) {
  const verdicts = r.meetpunten.map((m) => t.metingOf(m._id, t.year)?.beoordeling);
  const groen = verdicts.filter((v) => v === 'groen').length;
  const rood = verdicts.filter((v) => v === 'rood').length;
  return (
    <>
      <tr className="exp-row">
        <td colSpan={cols}>
          <div className="tree-head">
            <button className="tree-toggle" onClick={toggle} aria-expanded={open}><Chevron open={open} /> <strong>{r.name}</strong></button>
            <span className="tally">
              <span>{r.meetpunten.length} meetpunt{r.meetpunten.length === 1 ? '' : 'en'}</span>
              {groen > 0 && <span className="tally-dot ok" title={`Groen in ${t.year}`}>{groen}</span>}
              {rood > 0 && <span className="tally-dot actie" title={`Rood in ${t.year}`}>{rood}</span>}
            </span>
            {linked && <span className="muted" style={{ fontSize: 12 }}>in een operationeel doel van {t.year}</span>}
            <span className="spacer" />
            <button className="link-btn" onClick={() => onAdd(r._id)}>+ meetpunt</button>
          </div>
        </td>
      </tr>
      {open && r.meetpunten.length === 0 && <tr><td colSpan={cols} className="muted">Nog geen meetpunten voor deze school.</td></tr>}
      {open && r.meetpunten.map((m) => (
        <tr key={m._id} style={m.active ? undefined : { opacity: 0.55 }}>
          <td>
            <button className="link-btn strong" onClick={() => onEdit(m)}>{m.title}</button>
            {m.uitleg && <div className="muted" style={{ fontSize: 12 }}>{m.uitleg}</div>}
          </td>
          <td>{m.bron || '—'}</td>
          <td>{m.month ? monthLabel(m.month) : '—'}</td>
          <td>{thresholdLabel(m) || '—'}</td>
          {years.map((y) => {
            const mt = t.metingOf(m._id, y);
            const open = t.actionsOf(m._id, y).filter((a) => a.status !== 'afgerond').length;
            return (
              <td key={y} className={`meting-cell ${y === t.year ? 'year-current' : ''}`}>
                <button className="meting-btn" onClick={() => onMeting(m, y)} title="Meting invullen">
                  {mt ? (
                    <>
                      <span className="meting-value">{formatValue(m, mt.value) || '—'}</span> <Beoordeling value={mt.beoordeling} empty="" />
                    </>
                  ) : <span className="muted">+</span>}
                  {open > 0 && <span className="meting-actions-count" title="Open acties">{open} actie{open === 1 ? '' : 's'}</span>}
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
