import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { Beoordeling, MetingModal, formatValue } from '../../test/TestBits';
import { goalMeetpunten, isFilled, monthPhase } from '../../test/assess';
import { PLAN_MONTHS } from '../../utils/constants';

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

  if (!t.schoolId) return <NoSchool />;
  const all = months.flatMap((mo) => mo.items);
  const count = (s) => all.filter((i) => i.state === s).length;
  const resultName = (m) => t.resultById[m.result]?.name || '';

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
      </div>

      {t.loading ? <p className="muted">Laden…</p> : all.length === 0 ? (
        <div className="card empty-state">Nog geen meetpunten{onlyGoals ? ' bij de operationele doelen' : ''}. Voeg ze toe onder Meetpunten en kies een maand van evaluatie.</div>
      ) : (
        <div className="cal-grid">
          {months.filter((mo) => mo.items.length || mo.phase === 'now').map((mo) => (
            <section key={mo.key || 'none'} className={`card cal-month ${mo.phase}`}>
              <h3>{mo.label}{mo.phase === 'now' && <span className="cal-now">deze maand</span>}</h3>
              {mo.items.length === 0 ? <p className="muted" style={{ margin: 0 }}>Niets te evalueren.</p> : (
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
