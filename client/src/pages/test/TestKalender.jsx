import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { ActionModal, Beoordeling, IndicatorModal, formatValue } from '../../test/TestBits';
import { fillState, monthPhase } from '../../test/assess';
import { PLAN_MONTHS } from '../../utils/constants';
import { useCollapse, Chevron, ToggleAll } from '../../components/Collapse';

// Which indicators and meetpunten of actions have to be measured in which month of the active school year
export default function TestKalender() {
  const { school } = useApp();
  const t = useTest();
  const [onlyIndicators, setOnlyIndicators] = useState(false);
  const [open, setOpen] = useState(null); // { indicator } or { action }

  const months = useMemo(() => {
    const list = t.yearMeetpunten.filter((m) => !onlyIndicators || m.kind === 'indicator');
    return PLAN_MONTHS.map((mo, idx) => ({
      ...mo,
      phase: monthPhase(t.year, idx),
      items: list.filter((m) => m.month === mo.key).map((m) => ({ m, state: fillState(m, t.year) })),
    }));
  }, [t.yearMeetpunten, t.year, onlyIndicators]);

  // Open by default: this month and every month with something overdue; the rest show a tally only
  const c = useCollapse(() => months.filter((mo) => mo.phase === 'now' || mo.items.some((i) => i.state === 'late')).map((mo) => mo.key), !t.loading);
  const monthKeys = months.filter((mo) => mo.items.length).map((mo) => mo.key);

  if (!t.schoolId) return <NoSchool />;
  const all = months.flatMap((mo) => mo.items);
  const count = (s) => all.filter((i) => i.state === s).length;
  const openItem = (m) => { t.setError(''); setOpen(m.kind === 'indicator' ? { indicator: m } : { action: t.actions.find((a) => a._id === m.action) }); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Kalender</h1>
          <p>Welke indicatoren en meetpunten van acties van {school?.name} worden in welke maand van {t.year} gemeten? Klik erop om de meting in te vullen.</p>
        </div>
      </div>
      <ErrorBanner message={!open ? t.error : ''} />

      <div className="stat-grid">
        <div className="stat"><div className="label">Deze maand in te vullen</div><div className="value st-monitoren">{count('now')}</div></div>
        <div className="stat"><div className="label">Te laat</div><div className="value st-actie">{count('late')}</div></div>
        <div className="stat"><div className="label">Ingevuld</div><div className="value">{count('done')}</div></div>
        <div className="stat"><div className="label">Nog gepland</div><div className="value">{count('planned')}</div></div>
      </div>
      <div className="toolbar">
        <label className="checkbox-row" style={{ margin: 0 }}>
          <input type="checkbox" checked={onlyIndicators} onChange={(e) => setOnlyIndicators(e.target.checked)} /> Enkel indicatoren
        </label>
        <span className="spacer" />
        <ToggleAll c={c} keys={monthKeys} />
      </div>

      {t.loading ? <p className="muted">Laden…</p> : all.length === 0 ? (
        <div className="card empty-state">Nog niets te meten in {t.year}. Voeg indicatoren toe bij een operationeel doel, of een meetpunt bij een actie.</div>
      ) : (
        <div className="cal-grid">
          {months.filter((mo) => mo.items.length || mo.phase === 'now').map((mo) => (
            <section key={mo.key} className={`card cal-month ${mo.phase} ${c.isOpen(mo.key) ? '' : 'folded'}`}>
              <h3>
                <button className="tree-toggle" onClick={() => c.toggle(mo.key)} aria-expanded={c.isOpen(mo.key)} disabled={!mo.items.length}>
                  {mo.items.length > 0 && <Chevron open={c.isOpen(mo.key)} />} {mo.label}
                </button>
                {mo.phase === 'now' && <span className="cal-now">deze maand</span>}
                <MonthTally items={mo.items} />
              </h3>
              {!c.isOpen(mo.key) ? null : mo.items.length === 0 ? <p className="muted" style={{ margin: 0 }}>Niets te evalueren.</p> : (
                <ul className="cal-list">
                  {mo.items.map(({ m, state }) => (
                    <li key={m._id} className={`cal-item ${state}`}>
                      <button className="cal-btn" onClick={() => openItem(m)}>
                        <span className="cal-title"><span className="kind-tag">{m.kind === 'indicator' ? 'Indicator' : 'Actie'}</span>{m.title}</span>
                        <span className="muted cal-sub">{t.goalById[m.goal]?.title}{m.bron && ` · ${m.bron}`}</span>
                        <span className="cal-state">
                          {state === 'done' ? 'ingevuld' : state === 'late' ? 'te laat' : state === 'now' ? 'in te vullen' : 'gepland'}
                        </span>
                        {state === 'done' && (
                          <span className="cal-result">
                            {formatValue(m, m.value)} <Beoordeling value={m.beoordeling} empty="" />
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {open?.indicator && <IndicatorModal indicator={open.indicator} goal={t.goalById[open.indicator.goal]} t={t} onClose={() => setOpen(null)} />}
      {open?.action && <ActionModal action={open.action} t={t} onClose={() => setOpen(null)} />}
    </div>
  );
}

// Compact count per state, shown in every month header (also when folded)
function MonthTally({ items }) {
  const n = (st) => items.filter((i) => i.state === st).length;
  if (!items.length) return null;
  return (
    <span className="tally cal-tally">
      {n('done') > 0 && <span className="tally-dot filled" title="Ingevuld">{n('done')}</span>}
      {n('late') > 0 && <span className="tally-dot actie" title="Te laat">{n('late')}</span>}
      {n('now') > 0 && <span className="tally-dot monitoren" title="Deze maand in te vullen">{n('now')}</span>}
      {n('planned') > 0 && <span className="tally-dot none" title="Gepland">{n('planned')}</span>}
    </span>
  );
}
