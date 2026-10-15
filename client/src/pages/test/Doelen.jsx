import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { Beoordeling, CategoryTag, GoalModal, GoalStatus, MeetpuntModal, MetingModal, formatValue } from '../../test/TestBits';
import { assessGoal, goalMeetpunten, inResult } from '../../test/assess';
import { FIRST_GOAL_YEAR, TEST_CATEGORIES } from '../../utils/constants';
import { useCollapse, Chevron, ToggleAll } from '../../components/Collapse';

// Test: the school's operational goals for the active school year, each with its beoogde resultaten
// and, under those, the school's meetpunten with this year's measurement.
export default function Doelen() {
  const { school } = useApp();
  const t = useTest();
  const [goal, setGoal] = useState(null);
  const [meetpunt, setMeetpunt] = useState(null);
  const [meting, setMeting] = useState(null); // meetpunt whose measurement of this year is open
  const [params] = useSearchParams();
  const focus = params.get('goal') || ''; // ?goal=<id>, e.g. from the ROK page

  // Goal cards fold to their header; a requested goal opens, and with only a few goals all open
  const c = useCollapse(() => (focus ? [focus] : t.goals.length <= 2 ? t.goals.map((g) => g._id) : []), !t.loading);
  useEffect(() => {
    if (!focus || t.loading) return;
    c.expand([focus]);
    setTimeout(() => document.getElementById(`goal-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [focus, t.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t.schoolId) return <NoSchool />;
  const tooEarly = t.year < FIRST_GOAL_YEAR;
  const catOrder = (id) => TEST_CATEGORIES.findIndex((c) => c.key === t.resultById[id]?.category);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Operationele doelen</h1>
          <p>De operationele doelen van {school?.name} voor {t.year}, met de beoogde resultaten en meetpunten die ze opvolgen.</p>
        </div>
        {!tooEarly && <button className="btn btn-primary" onClick={() => { t.setError(''); setGoal({}); }}>+ Nieuw operationeel doel</button>}
      </div>
      <ErrorBanner message={!goal && !meetpunt && !meting ? t.error : ''} />
      {!tooEarly && t.goals.length > 1 && (
        <div className="toolbar"><span className="spacer" /><ToggleAll c={c} keys={t.goals.map((g) => g._id)} /></div>
      )}

      {tooEarly ? (
        <div className="card empty-state">Operationele doelen starten in {FIRST_GOAL_YEAR}. Kies rechtsboven dat schooljaar of later. Metingen kan je wel al vanaf 2024-2025 invullen onder Meetpunten.</div>
      ) : t.loading ? <p className="muted">Laden…</p> : t.goals.length === 0 ? (
        <div className="card empty-state">Nog geen operationele doelen voor {t.year}. Voeg er een toe en koppel het aan het ROK en aan beoogde resultaten.</div>
      ) : t.goals.map((g) => {
        const mps = goalMeetpunten(g, t.meetpunten);
        const a = assessGoal(g, t, t.year);
        const openActions = t.actions.filter((a) => a.status !== 'afgerond' && mps.some((m) => m._id === a.meetpunt)).length;
        const open = c.isOpen(g._id);
        return (
          <section key={g._id} id={`goal-${g._id}`} className={`card goal-card ${g._id === focus ? 'focus' : ''}`}>
            <div className="tree-head">
              <button className="tree-toggle" onClick={() => c.toggle(g._id)} aria-expanded={open}>
                <Chevron open={open} /> <h2 style={{ margin: 0 }}>{g.title}</h2>
              </button>
              <span className="spacer" />
              <GoalStatus a={a} />
              <span className="tally">
                {a.total > 0 && <span>{a.groen} groen · {a.rood} rood · {a.open} nog niet gemeten</span>}
                {openActions > 0 && <span>· {openActions} open actie{openActions === 1 ? '' : 's'}</span>}
              </span>
              <button className="btn btn-sm" onClick={() => { t.setError(''); setGoal(g); }}>Bewerken</button>
            </div>
            {open && g.description && <p className="muted">{g.description}</p>}
            {open && g.rok.length > 0 && (
              <div className="goal-rok">Draagt bij aan: {g.rok.map((code) => (
                <Link key={code} to={`/rok?code=${code}`} className="tag tag-link" title={t.rokByCode[code]?.title}>{code}</Link>
              ))}</div>
            )}

            {open && [...g.results].sort((a, b) => catOrder(a) - catOrder(b)).map((rid) => {
              const r = t.resultById[rid];
              if (!r) return null;
              const list = t.meetpunten.filter((m) => inResult(m, rid) && m.active);
              return (
                <div key={rid} className="goal-result">
                  <div className="tree-head">
                    <CategoryTag category={r.category} /> <strong>{r.name}</strong>
                    <span className="spacer" />
                    <button className="link-btn" onClick={() => { t.setError(''); setMeetpunt({ results: [rid] }); }}>+ meetpunt</button>
                  </div>
                  {list.length === 0 ? <p className="muted goal-empty">Nog geen meetpunten voor deze school.</p> : (
                    <table className="so-table goal-mps">
                      <tbody>
                        {list.map((m) => {
                          const mt = t.metingOf(m._id, t.year);
                          return (
                            <tr key={m._id}>
                              <td><button className="link-btn strong" onClick={() => setMeting(m)}>{m.title}</button>{m.bron && <div className="muted">{m.bron}</div>}</td>
                              <td style={{ width: 140 }}>{mt ? formatValue(m, mt.value) || <span className="muted">—</span> : <span className="muted">niet gemeten</span>}</td>
                              <td style={{ width: 80 }}><Beoordeling value={mt?.beoordeling} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}

      {goal && <GoalModal goal={goal} t={t} onClose={() => setGoal(null)} />}
      {meetpunt && <MeetpuntModal meetpunt={meetpunt} t={t} onClose={() => setMeetpunt(null)} />}
      {meting && <MetingModal meetpunt={meting} schoolYear={t.year} t={t} onClose={() => setMeting(null)} />}
    </div>
  );
}
