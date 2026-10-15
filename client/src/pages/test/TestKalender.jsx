import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { Beoordeling, MetingModal, formatValue } from '../../test/TestBits';
import { goalMeetpunten, isFilled, monthPhase, resultNames } from '../../test/assess';
import { PLAN_MONTHS } from '../../utils/constants';
import { useCollapse, Chevron, ToggleAll } from '../../components/Collapse';

// Test: which meetpunten have to be filled in in which month of the active school year
export default function TestKalender() {
  const { school } = useApp();
  const t = useTest();
  const [onlyGoals, setOnlyGoals] = useState(false);
  const [meting, setMeting] = useState(null);

  const inGoals = useMemo(() => new Set(t.goals.flatMap((g) => goalMeetpunten(g, t.meetpunten).map((m) => m._id))), [t.goals, t.meetpunten]);

  const months = useMemo(() => {
    const list = t.meetpunten.filter((m) => m.active && (!onlyGoals || inGoals.has(m._id)));
    const withState = (m, phase) => {
      const mt = t.metingOf(m._id, t.year);
      const state = isFilled(mt) ? 'done' : phase === 'past' ? 'late' : phase === 'now' ? 'now' : 'planned';
      return { m, mt, state };
    };
    const out = PLAN_MONTHS.map((mo, idx) => {
      const phase = monthPhase(t.year, idx);
      return { ...mo, phase, items: list.filter((m) => m.month === mo.key).map((m) => withState(m, phase)) };
    });
    out.push({ key: '', label: 'Zonder evaluatiemaand', phase: 'none', items: list.filter((m) => !m.month).map((m) => withState(m, 'future')) });
    return out;
  }, [t, onlyGoals, inGoals]);

  // Open by default: this month and every month with something overdue; the rest show a tally only
  const c = useCollapse(() => months.filter((mo) => mo.phase === 'now' || mo.items.some((i) => i.state === 'late')).map((mo) => mo.key || 'none'), !t.loading);
  const monthKeys = months.filter((mo) => mo.items.length).map((mo) => mo.key || 'none');

  if (!t.schoolId) return <NoSchool />;
  const all = months.flatMap((mo) => mo.items);
  const count = (s) => all.filter((i) => i.state === s).length;
  const resultName = (m) => resultNames(m, t.resultById);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Kalender</h1>
          <p>Welke meetpunten van {school?.name} worden in welke maand van {t.year} geëvalueerd? Klik op een meetpunt om de meting in te vullen.</p>
        </div>
      </div>
      <ErrorBanner message={!meting ? t.error : ''} />

      <div className="stat-grid">
        <div className="stat"><div className="label">Deze maand in te vullen</div><div className="value st-monitoren">{count('now')}</div></div>
        <div className="stat"><div className="label">Achterstallig</div><div className="value st-actie">{count('late')}</div></div>
        <div className="stat"><div className="label">Ingevuld</div><div className="value st-ok">{count('done')}</div></div>
        <div className="stat"><div className="label">Nog gepland</div><div className="value">{count('planned')}</div></div>
      </div>
      <div className="toolbar">
        <label className="checkbox-row" style={{ margin: 0 }}>
          <input type="checkbox" checked={onlyGoals} onChange={(e) => setOnlyGoals(e.target.checked)} /> Enkel meetpunten van de operationele doelen van {t.year}
        </label>
        <span className="spacer" />
        <ToggleAll c={c} keys={monthKeys} />
      </div>

      {t.loading ? <p className="muted">Laden…</p> : all.length === 0 ? (
        <div className="card empty-state">Nog geen meetpunten{onlyGoals ? ' bij de operationele doelen' : ''}. Voeg ze toe onder Meetpunten en kies een maand van evaluatie.</div>
      ) : (
        <div className="cal-grid">
          {months.filter((mo) => mo.items.length || mo.phase === 'now').map((mo) => (
            <section key={mo.key || 'none'} className={`card cal-month ${mo.phase} ${c.isOpen(mo.key || 'none') ? '' : 'folded'}`}>
              <h3>
                <button className="tree-toggle" onClick={() => c.toggle(mo.key || 'none')} aria-expanded={c.isOpen(mo.key || 'none')} disabled={!mo.items.length}>
                  {mo.items.length > 0 && <Chevron open={c.isOpen(mo.key || 'none')} />} {mo.label}
                </button>
                {mo.phase === 'now' && <span className="cal-now">deze maand</span>}
                <MonthTally items={mo.items} />
              </h3>
              {!c.isOpen(mo.key || 'none') ? null : mo.items.length === 0 ? <p className="muted" style={{ margin: 0 }}>Niets te evalueren.</p> : (
                <ul className="cal-list">
                  {mo.items.map(({ m, mt, state }) => (
                    <li key={m._id} className={`cal-item ${state}`}>
                      <button className="cal-btn" onClick={() => { t.setError(''); setMeting(m); }}>
                        <span className="cal-title">{m.title}</span>
                        <span className="muted cal-sub">{resultName(m)}{m.bron && ` · ${m.bron}`}</span>
                        <span className="cal-state">
                          {state === 'done' ? <>{formatValue(m, mt.value)} <Beoordeling value={mt.beoordeling} empty="" /></>
                            : state === 'late' ? 'achterstallig' : state === 'now' ? 'in te vullen' : 'gepland'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {meting && <MetingModal meetpunt={meting} schoolYear={t.year} t={t} onClose={() => setMeting(null)} />}
    </div>
  );
}

// Compact count per state, shown in every month header (also when folded)
function MonthTally({ items }) {
  const n = (st) => items.filter((i) => i.state === st).length;
  if (!items.length) return null;
  return (
    <span className="tally cal-tally">
      {n('done') > 0 && <span className="tally-dot ok" title="Ingevuld">{n('done')}</span>}
      {n('late') > 0 && <span className="tally-dot actie" title="Achterstallig">{n('late')}</span>}
      {n('now') > 0 && <span className="tally-dot monitoren" title="Deze maand in te vullen">{n('now')}</span>}
      {n('planned') > 0 && <span className="tally-dot none" title="Gepland">{n('planned')}</span>}
    </span>
  );
}
