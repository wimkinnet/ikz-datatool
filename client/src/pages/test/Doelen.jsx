import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { ActionModal, Beoordeling, CategoryTag, GoalModal, GoalStatus, IndicatorModal, formatValue, thresholdLabel } from '../../test/TestBits';
import { assessGoal, goalDomains, goalSignals, isFilled, rokCode, signalCode, strategicCode } from '../../test/assess';
import { FIRST_GOAL_YEAR, TEST_CATEGORIES, actionStatusLabel, monthLabel } from '../../utils/constants';
import { useCollapse, Chevron, ToggleAll } from '../../components/Collapse';

// Test: the school's operational goals for the active school year, each with its beoogde resultaten
// and, under those, the school's meetpunten with this year's measurement.
export default function Doelen() {
  const { school } = useApp();
  const t = useTest();
  const [goal, setGoal] = useState(null);
  const [indicator, setIndicator] = useState(null); // { goal, indicator? }
  const [action, setAction] = useState(null);
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
          <p>De operationele doelen van {school?.name} voor {t.year}, met hun indicatoren en acties.</p>
        </div>
        {!tooEarly && <button className="btn btn-primary" onClick={() => { t.setError(''); setGoal({}); }}>+ Nieuw operationeel doel</button>}
      </div>
      <ErrorBanner message={!goal && !indicator && !action ? t.error : ''} />
      {!tooEarly && t.goals.length > 1 && (
        <div className="toolbar"><span className="spacer" /><ToggleAll c={c} keys={t.goals.map((g) => g._id)} /></div>
      )}

      {tooEarly ? (
        <div className="card empty-state">Operationele doelen starten in {FIRST_GOAL_YEAR}. Kies rechtsboven dat schooljaar of later. </div>
      ) : t.loading ? <p className="muted">Laden…</p> : t.goals.length === 0 ? (
        <div className="card empty-state">Nog geen operationele doelen voor {t.year}. Voeg er een toe en koppel het aan het ROK en aan signalen.</div>
      ) : t.goals.map((g) => {
        const domains = goalDomains(g, t.signals);
        const a = assessGoal(g, t);
        const indicators = t.indicatorsOf(g._id);
        const goalActions = t.actionsOf(g._id);
        const openActions = goalActions.filter((x) => x.status !== 'uitgevoerd').length;
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
                {a.total > 0 && <span>{a.done} van {a.total} indicatoren ingevuld{a.done > 0 && ` · ${a.groen} op niveau · ${a.rood} onder niveau`}</span>}
                {goalActions.length > 0 && <span>· {openActions} van {goalActions.length} {goalActions.length === 1 ? 'actie' : 'acties'} nog niet uitgevoerd</span>}
              </span>
              <button className="btn btn-sm" onClick={() => { t.setError(''); setGoal(g); }}>Bewerken</button>
            </div>
            {open && g.description && <p className="muted">{g.description}</p>}
            {open && (g.rok.length > 0 || g.signals?.length > 0 || g.strategic?.length > 0) && (
              <div className="goal-rok">Draagt bij aan: {g.rok.map((code) => (
                <Link key={code} to={`/rok?code=${code}`} className="tag tag-link" title={t.rokByCode[code]?.title}>{rokCode(code)}</Link>
              ))}{goalSignals(g, t.signals).map((s) => (
                <Link key={s._id} to={`/signalen?signal=${s._id}`} className="tag tag-link" title={s.title}>{signalCode(s)}</Link>
              ))}{t.strategic.filter((s) => g.strategic?.includes(s._id)).map((s) => (
                <Link key={s._id} to={`/strategische-doelen?doel=${s._id}`} className="tag tag-link" title={s.title}>{strategicCode(s)}</Link>
              ))}</div>
            )}
            {open && domains.length > 0 && (
              <div className="goal-rok goal-domains">Domeinen: {[...domains].sort((a, b) => catOrder(a) - catOrder(b)).map((rid) => t.resultById[rid] && (
                <span key={rid}><CategoryTag category={t.resultById[rid].category} /> {t.resultById[rid].name}</span>
              ))}</div>
            )}

            {open && (
              <div className="goal-section">
                <div className="tree-head">
                  <h3>Indicatoren</h3>
                  <span className="muted" style={{ fontSize: 12.5 }}>meten het succes van dit doel</span>
                  <span className="spacer" />
                  <button className="link-btn" onClick={() => { t.setError(''); setIndicator({ goal: g }); }}>+ indicator</button>
                </div>
                {indicators.length === 0 ? <p className="muted goal-empty">Nog geen indicatoren.</p> : (
                  <table className="so-table goal-mps">
                    <thead><tr><th>Indicator</th><th>Moment</th><th>Drempelwaarde</th><th>Waarde</th><th>Resultaat</th></tr></thead>
                    <tbody>
                      {indicators.map((m) => (
                        <tr key={m._id}>
                          <td><button className="link-btn strong" onClick={() => { t.setError(''); setIndicator({ goal: g, indicator: m }); }}>{m.title}</button>{m.bron && <div className="muted">{m.bron}</div>}</td>
                          <td style={{ width: 100 }}>{monthLabel(m.month)}</td>
                          <td style={{ width: 120 }}>{thresholdLabel(m) || '—'}</td>
                          <td style={{ width: 130 }}>{isFilled(m) ? formatValue(m, m.value) || '—' : <span className="muted">nog niet ingevuld</span>}</td>
                          <td style={{ width: 120 }}><Beoordeling value={m.beoordeling} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {open && (
              <div className="goal-section">
                <div className="tree-head">
                  <h3>Acties</h3>
                  <span className="spacer" />
                  <button className="link-btn" onClick={() => { t.setError(''); setAction({ goal: g._id }); }}>+ actie</button>
                </div>
                {goalActions.length === 0 ? <p className="muted goal-empty">Nog geen acties.</p> : (
                  <table className="so-table goal-mps">
                    <thead><tr><th>Actie</th><th>Status</th><th>Meetpunt</th><th>Moment</th><th>Resultaat</th></tr></thead>
                    <tbody>
                      {goalActions.map((a) => {
                        const m = t.meetpuntOfAction(a._id);
                        return (
                          <tr key={a._id}>
                            <td><button className="link-btn strong" onClick={() => { t.setError(''); setAction(a); }}>{a.title}</button>{a.owner && <div className="muted">{a.owner}</div>}</td>
                            <td style={{ width: 130 }}><span className={`status-pill task-${a.status}`}>{actionStatusLabel(a.status)}</span></td>
                            <td>{m ? <>{m.title}{isFilled(m) && <div className="muted">{formatValue(m, m.value)}</div>}</> : <span className="muted">geen</span>}</td>
                            <td style={{ width: 100 }}>{m ? monthLabel(m.month) : '—'}</td>
                            <td style={{ width: 120 }}>{m ? <Beoordeling value={m.beoordeling} /> : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        );
      })}

      {goal && <GoalModal goal={goal} t={t} onClose={() => setGoal(null)} />}
      {indicator && <IndicatorModal goal={indicator.goal} indicator={indicator.indicator} t={t} onClose={() => setIndicator(null)} />}
      {action && <ActionModal action={action} t={t} onClose={() => setAction(null)} />}
    </div>
  );
}
