import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner, ChartEmpty } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { GoalStatus, MetingModal, formatValue } from '../../test/TestBits';
import { assessGoal, CHART, GOAL_STATUS, meetpuntState, monthPhase, resultNames, resultsOf } from '../../test/assess';
import { FIRST_GOAL_YEAR, FIRST_MEASURE_YEAR, PLAN_MONTHS, TEST_CATEGORIES, currentSchoolYear, yearsBetween } from '../../utils/constants';
import { formatDate } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => PLAN_MONTHS[(new Date().getMonth() + 4) % 12].key;
const short = (s, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
// Hide a segment label when the segment is empty (Recharts still renders "0")
const countLabel = (v) => (v ? v : '');

const MONTH_SHORT = ['sep', 'okt', 'nov', 'dec', 'jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug'];

// Month chart series, in stack order (keeps red and green apart; validated palette, see test/assess.js)
const MONTH_SERIES = [
  { key: 'groen', label: 'Groen', color: CHART.groen, ink: '#fff' },
  { key: 'ingevuld', label: 'Ingevuld, zonder beoordeling', color: CHART.ingevuld, ink: '#fff' },
  { key: 'rood', label: 'Rood', color: CHART.rood, ink: '#fff' },
  { key: 'late', label: 'Achterstallig', color: CHART.aandacht, ink: '#fff' },
  { key: 'todo', label: 'Nog in te vullen', color: CHART.none, ink: '#14302f' },
];

// Test: one overview of the school's operational goals, meetpunten and actions for the active school year
export default function TestDashboard() {
  const { school } = useApp();
  const t = useTest();
  const [meting, setMeting] = useState(null);
  const year = t.year;

  const data = useMemo(() => {
    const active = t.meetpunten.filter((m) => m.active);
    const verdictOf = (m, y) => t.metingOf(m._id, y)?.beoordeling || null;

    const goals = t.goals.map((g) => ({ g, a: assessGoal(g, t, year) }));
    const goalStatusCount = Object.fromEntries(Object.keys(GOAL_STATUS).map((k) => [k, goals.filter((x) => x.a.key === k).length]));
    const goalBars = goals.map(({ g, a }) => ({ name: short(g.title), full: g.title, groen: a.groen, rood: a.rood, open: a.open, status: a.label }));

    const verdicts = active.map((m) => verdictOf(m, year));
    const groen = verdicts.filter((v) => v === 'groen').length;
    const rood = verdicts.filter((v) => v === 'rood').length;

    const lastYear = year > FIRST_MEASURE_YEAR ? year : FIRST_MEASURE_YEAR;
    const trend = yearsBetween(FIRST_MEASURE_YEAR, lastYear).map((y) => {
      const v = t.meetpunten.map((m) => verdictOf(m, y)).filter(Boolean);
      const g = v.filter((x) => x === 'groen').length;
      return { name: y, pct: v.length ? Math.round((g / v.length) * 100) : null, groen: g, total: v.length };
    });

    const perCategory = TEST_CATEGORIES.map((c) => {
      // A meetpunt counts once in every category one of its beoogde resultaten belongs to
      const list = active.filter((m) => resultsOf(m).some((id) => t.resultById[id]?.category === c.key));
      const v = list.map((m) => verdictOf(m, year));
      return { name: c.label, groen: v.filter((x) => x === 'groen').length, rood: v.filter((x) => x === 'rood').length, open: v.filter((x) => !x).length };
    }).filter((c) => c.groen + c.rood + c.open > 0);

    const openActions = t.actions.filter((a) => a.status !== 'afgerond');
    const late = openActions.filter((a) => a.dueDate && a.dueDate.slice(0, 10) < today());
    const redWithoutAction = active.filter((m) => verdictOf(m, year) === 'rood' && !t.actionsOf(m._id, year).some((a) => a.status !== 'afgerond'));
    const dueNow = year === currentSchoolYear()
      ? active.filter((m) => m.month === thisMonth() && !t.metingOf(m._id, year)).length
      : null;

    // Meetpunten per evaluation month of the active school year, by state
    const perMonth = PLAN_MONTHS.map((mo, idx) => {
      const phase = monthPhase(year, idx);
      const row = { name: MONTH_SHORT[idx], full: mo.label, phase, groen: 0, ingevuld: 0, rood: 0, late: 0, todo: 0 };
      for (const m of active.filter((x) => x.month === mo.key)) {
        const st = meetpuntState(t.metingOf(m._id, year), phase);
        row[st === 'now' || st === 'planned' ? 'todo' : st]++;
      }
      row.total = row.groen + row.ingevuld + row.rood + row.late + row.todo;
      return row;
    });
    const withoutMonth = active.filter((m) => !m.month).length;

    return { perMonth, withoutMonth, goals, goalStatusCount, goalBars, total: active.length, groen, rood, trend, perCategory, openActions, late, redWithoutAction, dueNow };
  }, [t, year]);

  if (!t.schoolId) return <NoSchool />;
  const measured = data.groen + data.rood;
  const pctGroen = measured ? Math.round((data.groen / measured) * 100) : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Hoe staan de operationele doelen, meetpunten en acties van {school?.name} ervoor in {year}?</p>
        </div>
      </div>
      <ErrorBanner message={!meting ? t.error : ''} />

      <div className="stat-grid">
        <div className="stat">
          <div className="label">Operationele doelen</div>
          <div className="value">{year < FIRST_GOAL_YEAR ? '—' : data.goals.length}</div>
          {data.goals.length > 0 && (
            <div className="stat-sub">{data.goalStatusCount.ok} op koers · {data.goalStatusCount.aandacht} aandacht · {data.goalStatusCount.niet} niet op koers</div>
          )}
        </div>
        <div className="stat">
          <div className="label">Meetpunten beoordeeld</div>
          <div className="value">{measured}<small> / {data.total}</small></div>
          <div className="stat-sub">{data.total ? `${Math.round((measured / data.total) * 100)}% van de meetpunten` : 'nog geen meetpunten'}</div>
        </div>
        <div className="stat">
          <div className="label">Groen</div>
          <div className="value st-ok">{pctGroen === null ? '—' : `${pctGroen}%`}</div>
          <div className="stat-sub">{data.groen} groen · {data.rood} rood</div>
        </div>
        <Link to="/taken" className="stat stat-link">
          <div className="label">Open acties</div>
          <div className="value">{data.openActions.length}</div>
          <div className={`stat-sub ${data.late.length ? 'st-actie' : ''}`}>{data.late.length} te laat</div>
        </Link>
        {data.dueNow !== null && (
          <Link to="/kalender" className="stat stat-link">
            <div className="label">Deze maand in te vullen</div>
            <div className="value st-monitoren">{data.dueNow}</div>
            <div className="stat-sub">bekijk de kalender</div>
          </Link>
        )}
      </div>

      <div className="chart-grid">
        <div className="chart-card chart-wide">
          <h3>Meetpunten per maand ({year})</h3>
          {data.perMonth.every((r) => !r.total) ? <ChartEmpty>Nog geen meetpunten met een maand van evaluatie.</ChartEmpty> : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.perMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6eeee" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,128,125,0.06)' }} labelFormatter={(_, p) => (p?.[0] ? `${p[0].payload.full}${p[0].payload.phase === 'now' ? ' (deze maand)' : ''}` : '')} />
                  <Legend />
                  {MONTH_SERIES.map((sr) => (
                    <Bar key={sr.key} dataKey={sr.key} name={sr.label} stackId="m" fill={sr.color} stroke="#fff" strokeWidth={2} maxBarSize={48}>
                      <LabelList dataKey={sr.key} fill={sr.ink} fontSize={11} formatter={countLabel} />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
              {data.withoutMonth > 0 && <p className="muted" style={{ fontSize: 12.5 }}>{data.withoutMonth} meetpunt{data.withoutMonth === 1 ? '' : 'en'} zonder maand van evaluatie (niet in de grafiek).</p>}
            </>
          )}
        </div>

        <div className="chart-card">
          <h3>Inschatting per operationeel doel</h3>
          {year < FIRST_GOAL_YEAR ? <ChartEmpty>Operationele doelen starten in {FIRST_GOAL_YEAR}.</ChartEmpty>
            : data.goalBars.length === 0 ? <ChartEmpty>Nog geen operationele doelen voor {year}.</ChartEmpty> : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(180, data.goalBars.length * 46 + 60)}>
                  <BarChart data={data.goalBars} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }} barCategoryGap={10}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e6eeee" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={190} fontSize={12} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,128,125,0.06)' }} labelFormatter={(_, p) => (p?.[0] ? `${p[0].payload.full} · ${p[0].payload.status}` : '')} />
                    <Legend />
                    <Bar dataKey="groen" name="Groen" stackId="s" fill={CHART.groen} stroke="#fff" strokeWidth={2}><LabelList dataKey="groen" fill="#fff" fontSize={11} formatter={countLabel} /></Bar>
                    <Bar dataKey="rood" name="Rood" stackId="s" fill={CHART.rood} stroke="#fff" strokeWidth={2}><LabelList dataKey="rood" fill="#fff" fontSize={11} formatter={countLabel} /></Bar>
                    <Bar dataKey="open" name="Nog niet gemeten" stackId="s" fill={CHART.none} stroke="#fff" strokeWidth={2}><LabelList dataKey="open" fill="#14302f" fontSize={11} formatter={countLabel} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
                <ul className="goal-status-list">
                  {data.goals.map(({ g, a }) => <li key={g._id}><GoalStatus a={a} /> <Link to={`/doelen?goal=${g._id}`}>{g.title}</Link></li>)}
                </ul>
              </>
            )}
        </div>

        <div className="chart-card">
          <h3>Aandeel groen per schooljaar</h3>
          {data.trend.every((d) => d.pct === null) ? <ChartEmpty>Nog geen beoordeelde metingen.</ChartEmpty> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.trend} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6eeee" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" fontSize={12} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,128,125,0.06)' }} formatter={(v, _, p) => [v === null ? 'geen metingen' : `${v}% (${p.payload.groen} van ${p.payload.total} groen)`, 'Groen']} />
                <Bar dataKey="pct" name="Groen" fill={CHART.accent} radius={[4, 4, 0, 0]} maxBarSize={56}>
                  <LabelList dataKey="pct" position="top" fontSize={12} fill="#14302f" formatter={(v) => (v === null ? '' : `${v}%`)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Meetpunten per categorie ({year})</h3>
          {data.perCategory.length === 0 ? <ChartEmpty>Nog geen meetpunten.</ChartEmpty> : (
            <ResponsiveContainer width="100%" height={Math.max(180, data.perCategory.length * 50 + 60)}>
              <BarChart data={data.perCategory} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }} barCategoryGap={12}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e6eeee" />
                <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90} fontSize={12} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,128,125,0.06)' }} />
                <Legend />
                <Bar dataKey="groen" name="Groen" stackId="s" fill={CHART.groen} stroke="#fff" strokeWidth={2}><LabelList dataKey="groen" fill="#fff" fontSize={11} formatter={countLabel} /></Bar>
                <Bar dataKey="rood" name="Rood" stackId="s" fill={CHART.rood} stroke="#fff" strokeWidth={2}><LabelList dataKey="rood" fill="#fff" fontSize={11} formatter={countLabel} /></Bar>
                <Bar dataKey="open" name="Nog niet gemeten" stackId="s" fill={CHART.none} stroke="#fff" strokeWidth={2}><LabelList dataKey="open" fill="#14302f" fontSize={11} formatter={countLabel} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Aandachtspunten</h3>
          <h4 className="dash-sub">Rood in {year}, nog zonder open actie</h4>
          {data.redWithoutAction.length === 0 ? <p className="muted">Geen.</p> : (
            <ul className="dash-list">
              {data.redWithoutAction.map((m) => (
                <li key={m._id}>
                  <button className="link-btn strong" onClick={() => { t.setError(''); setMeting(m); }}>{m.title}</button>
                  <span className="muted"> · {formatValue(m, t.metingOf(m._id, year)?.value)} · {resultNames(m, t.resultById)}</span>
                </li>
              ))}
            </ul>
          )}
          <h4 className="dash-sub">Acties te laat</h4>
          {data.late.length === 0 ? <p className="muted">Geen.</p> : (
            <ul className="dash-list">
              {data.late.map((a) => (
                <li key={a._id}>
                  <Link to="/taken">{a.title}</Link>
                  <span className="muted"> · {a.owner || 'geen verantwoordelijke'} · deadline {formatDate(a.dueDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {meting && <MetingModal meetpunt={meting} schoolYear={year} t={t} onClose={() => setMeting(null)} />}
    </div>
  );
}
