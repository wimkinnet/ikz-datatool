import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner, ChartEmpty } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { GoalStatus, MetingModal, formatValue } from '../../test/TestBits';
import { assessGoal, CHART, GOAL_STATUS, monthPhase, resultNames, resultsOf, tally } from '../../test/assess';
import { FIRST_GOAL_YEAR, FIRST_MEASURE_YEAR, PLAN_MONTHS, TEST_CATEGORIES, yearsBetween } from '../../utils/constants';
import { formatDate } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);
const short = (s, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
// Hide a segment label when the segment is empty (Recharts still renders "0")
const countLabel = (v) => (v ? v : '');
const legendLabel = (value) => <span className="chart-legend-label">{value}</span>;

const MONTH_SHORT = ['sep', 'okt', 'nov', 'dec', 'jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug'];

// Invulstatus and resultaat are separate questions, each with its own series and charts.
// Result stacks keep op niveau and onder niveau apart (validated palette, see test/assess.js).
const FILL_SERIES = [
  { key: 'done', label: 'Ingevuld', color: CHART.ingevuld, ink: '#fff' },
  { key: 'late', label: 'Achterstallig', color: CHART.aandacht, ink: '#fff' },
  { key: 'todo', label: 'Nog in te vullen', color: CHART.none, ink: '#1f2a24' },
];
const RESULT_SERIES = [
  { key: 'groen', label: 'Op niveau', color: CHART.groen, ink: '#fff' },
  { key: 'zonder', label: 'Zonder beoordeling', color: CHART.none, ink: '#1f2a24' },
  { key: 'rood', label: 'Onder niveau', color: CHART.rood, ink: '#fff' },
];
const stackBars = (series) => series.map((sr) => (
  <Bar key={sr.key} dataKey={sr.key} name={sr.label} stackId="s" fill={sr.color} stroke="#fff" strokeWidth={2} maxBarSize={40}>
    <LabelList dataKey={sr.key} fill={sr.ink} fontSize={11} formatter={countLabel} />
  </Bar>
));

// One stacked column per month of the school year
function MonthChart({ rows, series }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="name" fontSize={12} tickLine={false} interval={0} />
        <YAxis allowDecimals={false} fontSize={12} tickLine={false} />
        <Tooltip cursor={{ fill: 'var(--chart-hover)' }} labelFormatter={(_, p) => (p?.[0] ? `${p[0].payload.full}${p[0].payload.phase === 'now' ? ' (deze maand)' : ''}` : '')} />
        <Legend formatter={legendLabel} />
        {stackBars(series)}
      </BarChart>
    </ResponsiveContainer>
  );
}

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
    const goalBars = goals.map(({ g, a }) => ({ name: short(g.title), full: g.title, groen: a.groen, zonder: a.zonder, rood: a.rood, status: a.label }));

    const all = tally(active, t, year);

    const lastYear = year > FIRST_MEASURE_YEAR ? year : FIRST_MEASURE_YEAR;
    const trend = yearsBetween(FIRST_MEASURE_YEAR, lastYear).map((y) => {
      const v = t.meetpunten.map((m) => verdictOf(m, y)).filter(Boolean);
      const g = v.filter((x) => x === 'groen').length;
      return { name: y, pct: v.length ? Math.round((g / v.length) * 100) : null, groen: g, total: v.length };
    });

    const perCategory = TEST_CATEGORIES.map((c) => {
      // A meetpunt counts once in every category one of its beoogde resultaten belongs to
      const list = active.filter((m) => resultsOf(m).some((id) => t.resultById[id]?.category === c.key));
      const n = tally(list, t, year);
      return { ...n, name: `${c.label} (${n.done}/${n.total})`, full: c.label };
    }).filter((c) => c.total > 0);

    const openActions = t.actions.filter((a) => a.status !== 'afgerond');
    const late = openActions.filter((a) => a.dueDate && a.dueDate.slice(0, 10) < today());
    const redWithoutAction = active.filter((m) => verdictOf(m, year) === 'rood' && !t.actionsOf(m._id, year).some((a) => a.status !== 'afgerond'));

    // Meetpunten per evaluation month of the active school year
    const perMonth = PLAN_MONTHS.map((mo, idx) => {
      const n = tally(active.filter((x) => x.month === mo.key), t, year);
      return { ...n, todo: n.now + n.planned, name: MONTH_SHORT[idx], full: mo.label, phase: monthPhase(year, idx) };
    });
    const withoutMonth = active.filter((m) => !m.month).length;

    return { perMonth, withoutMonth, goals, goalStatusCount, goalBars, all, trend, perCategory, openActions, late, redWithoutAction };
  }, [t, year]);

  if (!t.schoolId) return <NoSchool />;
  const { all } = data;
  const measured = all.groen + all.rood;
  const pctGroen = measured ? Math.round((all.groen / measured) * 100) : null;

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
        <Link to="/kalender" className="stat stat-link">
          <div className="label">Ingevuld</div>
          <div className="value">{all.done}<small> / {all.total}</small></div>
          <div className="stat-sub">
            {all.total === 0 ? 'nog geen meetpunten' : <><span className={all.late ? 'st-actie' : ''}>{all.late} achterstallig</span> · {all.now} deze maand</>}
          </div>
        </Link>
        <div className="stat">
          <div className="label">Op niveau</div>
          <div className="value st-ok">{pctGroen === null ? '—' : `${pctGroen}%`}</div>
          <div className="stat-sub">{all.groen} op niveau · {all.rood} onder niveau{all.zonder > 0 && ` · ${all.zonder} zonder beoordeling`}</div>
        </div>
        <Link to="/acties" className="stat stat-link">
          <div className="label">Open acties</div>
          <div className="value">{data.openActions.length}</div>
          <div className={`stat-sub ${data.late.length ? 'st-actie' : ''}`}>{data.late.length} te laat</div>
        </Link>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Invulstatus per maand ({year})</h3>
          {data.perMonth.every((r) => !r.total) ? <ChartEmpty>Nog geen meetpunten met een maand van evaluatie.</ChartEmpty> : (
            <>
              <MonthChart rows={data.perMonth} series={FILL_SERIES} />
              {data.withoutMonth > 0 && <p className="muted" style={{ fontSize: 12.5 }}>{data.withoutMonth} meetpunt{data.withoutMonth === 1 ? '' : 'en'} zonder maand van evaluatie (niet in de grafiek).</p>}
            </>
          )}
        </div>

        <div className="chart-card">
          <h3>Resultaat per maand ({year})</h3>
          {data.perMonth.every((r) => !r.done) ? <ChartEmpty>Nog geen ingevulde meetpunten in {year}.</ChartEmpty> : <MonthChart rows={data.perMonth} series={RESULT_SERIES} />}
        </div>

        <div className="chart-card">
          <h3>Inschatting per operationeel doel</h3>
          {year < FIRST_GOAL_YEAR ? <ChartEmpty>Operationele doelen starten in {FIRST_GOAL_YEAR}.</ChartEmpty>
            : data.goalBars.length === 0 ? <ChartEmpty>Nog geen operationele doelen voor {year}.</ChartEmpty> : (
              <>
                {data.goals.some(({ a }) => a.done > 0) && (
                  <ResponsiveContainer width="100%" height={Math.max(180, data.goalBars.length * 46 + 60)}>
                    <BarChart data={data.goalBars} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }} barCategoryGap={10}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                      <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={190} fontSize={12} tickLine={false} />
                      <Tooltip cursor={{ fill: 'var(--chart-hover)' }} labelFormatter={(_, p) => (p?.[0] ? `${p[0].payload.full} · ${p[0].payload.status}` : '')} />
                      <Legend formatter={legendLabel} />
                      {stackBars(RESULT_SERIES)}
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <ul className="goal-status-list">
                  {data.goals.map(({ g, a }) => <li key={g._id}><GoalStatus a={a} /> <Link to={`/doelen?goal=${g._id}`}>{g.title}</Link> <span className="muted">· {a.done} van {a.total} ingevuld</span></li>)}
                </ul>
              </>
            )}
        </div>

        <div className="chart-card">
          <h3>Aandeel op niveau per schooljaar</h3>
          {data.trend.every((d) => d.pct === null) ? <ChartEmpty>Nog geen metingen met een resultaat.</ChartEmpty> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.trend} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" fontSize={12} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--chart-hover)' }} formatter={(v, _, p) => [v === null ? 'geen metingen' : `${v}% (${p.payload.groen} van ${p.payload.total} op niveau)`, 'Op niveau']} />
                <Bar dataKey="pct" name="Op niveau" fill={CHART.accent} radius={[4, 4, 0, 0]} maxBarSize={56}>
                  <LabelList dataKey="pct" position="top" fontSize={12} fill="var(--ink)" formatter={(v) => (v === null ? '' : `${v}%`)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Resultaat per categorie ({year})</h3>
          {data.perCategory.every((c) => !c.done) ? <ChartEmpty>Nog geen ingevulde meetpunten in {year}.</ChartEmpty> : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(180, data.perCategory.length * 50 + 60)}>
                <BarChart data={data.perCategory} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }} barCategoryGap={12}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                  <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} fontSize={12} tickLine={false} />
                  <Tooltip cursor={{ fill: 'var(--chart-hover)' }} />
                  <Legend formatter={legendLabel} />
                  {stackBars(RESULT_SERIES)}
                </BarChart>
              </ResponsiveContainer>
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>Tussen haakjes: ingevulde meetpunten / alle meetpunten.</p>
            </>
          )}
        </div>

        <div className="chart-card">
          <h3>Aandachtspunten</h3>
          <h4 className="dash-sub">Onder niveau in {year}, nog zonder open actie</h4>
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
                  <Link to="/acties">{a.title}</Link>
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
