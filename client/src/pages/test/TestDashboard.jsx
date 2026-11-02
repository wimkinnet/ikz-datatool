import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner, ChartEmpty } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { GoalStatus, IndicatorModal, formatValue } from '../../test/TestBits';
import { assessGoal, CHART, GOAL_STATUS, goalDomains, monthPhase, tally } from '../../test/assess';
import { FIRST_GOAL_YEAR, PLAN_MONTHS, TEST_ACTION_STATUSES, TEST_CATEGORIES, yearsBetween } from '../../utils/constants';
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
  { key: 'late', label: 'Te laat', color: CHART.aandacht, ink: '#fff' },
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
  const [indicator, setIndicator] = useState(null);
  const year = t.year;

  const data = useMemo(() => {
    const goals = t.goals.map((g) => ({ g, a: assessGoal(g, t) }));
    const goalStatusCount = Object.fromEntries(Object.keys(GOAL_STATUS).map((k) => [k, goals.filter((x) => x.a.key === k).length]));
    const goalBars = goals.map(({ g, a }) => ({ name: short(g.title), full: g.title, groen: a.groen, zonder: a.zonder, rood: a.rood, status: a.label }));

    // Invulstatus covers everything to measure this year; the result KPI is about the goals, so about their indicators
    const all = tally(t.yearMeetpunten, year);
    const indicators = t.yearMeetpunten.filter((m) => m.kind === 'indicator');
    const ind = tally(indicators, year);

    const lastYear = year > FIRST_GOAL_YEAR ? year : FIRST_GOAL_YEAR;
    const trend = yearsBetween(FIRST_GOAL_YEAR, lastYear).map((y) => {
      const n = tally(t.meetpunten.filter((m) => m.kind === 'indicator' && t.goalById[m.goal]?.schoolYear === y), y);
      const assessed = n.groen + n.rood;
      return { name: y, pct: assessed ? Math.round((n.groen / assessed) * 100) : null, groen: n.groen, total: assessed };
    });

    // A goal's indicators count in the category of each domein its signals are based on
    const perCategory = TEST_CATEGORIES.map((c) => {
      const inCat = goals.filter(({ g }) => goalDomains(g, t.signals).some((id) => t.resultById[id]?.category === c.key));
      const n = tally(inCat.flatMap(({ g }) => t.indicatorsOf(g._id)), year);
      return { ...n, name: `${c.label} (${n.done}/${n.total})`, full: c.label };
    }).filter((c) => c.total > 0);

    const openActions = t.yearActions.filter((a) => a.status !== 'uitgevoerd');
    const late = openActions.filter((a) => a.dueDate && a.dueDate.slice(0, 10) < today());
    const actionStatus = TEST_ACTION_STATUSES.map((s) => ({ name: s.label, count: t.yearActions.filter((a) => a.status === s.key).length }));
    // Indicators below level whose goal has no action in progress or still to do
    const belowWithoutAction = indicators.filter((m) => m.beoordeling === 'rood' && !t.actionsOf(m.goal).some((a) => a.status !== 'uitgevoerd'));

    // Everything to measure, per month of the active school year
    const perMonth = PLAN_MONTHS.map((mo, idx) => {
      const n = tally(t.yearMeetpunten.filter((x) => x.month === mo.key), year);
      return { ...n, todo: n.now + n.planned, name: MONTH_SHORT[idx], full: mo.label, phase: monthPhase(year, idx) };
    });

    return { perMonth, goals, goalStatusCount, goalBars, all, ind, trend, perCategory, openActions, late, actionStatus, belowWithoutAction };
  }, [t, year]);

  if (!t.schoolId) return <NoSchool />;
  const { all, ind } = data;
  const measured = ind.groen + ind.rood;
  const pctGroen = measured ? Math.round((ind.groen / measured) * 100) : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Hoe staan de operationele doelen, indicatoren en acties van {school?.name} ervoor in {year}?</p>
        </div>
      </div>
      <ErrorBanner message={!indicator ? t.error : ''} />

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
            {all.total === 0 ? 'nog niets te meten' : <><span className={all.late ? 'st-actie' : ''}>{all.late} te laat</span> · {all.now} deze maand</>}
          </div>
        </Link>
        <div className="stat">
          <div className="label">Indicatoren op niveau</div>
          <div className="value st-ok">{pctGroen === null ? '—' : `${pctGroen}%`}</div>
          <div className="stat-sub">{ind.groen} op niveau · {ind.rood} onder niveau{ind.zonder > 0 && ` · ${ind.zonder} zonder beoordeling`}</div>
        </div>
        <Link to="/acties" className="stat stat-link">
          <div className="label">Acties nog niet uitgevoerd</div>
          <div className="value">{data.openActions.length}</div>
          <div className={`stat-sub ${data.late.length ? 'st-actie' : ''}`}>{data.late.length} te laat</div>
        </Link>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Invulstatus per maand ({year})</h3>
          {data.perMonth.every((r) => !r.total) ? <ChartEmpty>Nog niets te meten in {year}.</ChartEmpty> : (
            <>
              <MonthChart rows={data.perMonth} series={FILL_SERIES} />
            </>
          )}
        </div>

        <div className="chart-card">
          <h3>Resultaat per maand ({year})</h3>
          {data.perMonth.every((r) => !r.done) ? <ChartEmpty>Nog niets ingevuld in {year}.</ChartEmpty> : <MonthChart rows={data.perMonth} series={RESULT_SERIES} />}
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
                  {data.goals.map(({ g, a }) => <li key={g._id}><GoalStatus a={a} /> <Link to={`/doelen?goal=${g._id}`}>{g.title}</Link> {a.total > 0 && <span className="muted">· {a.done} van {a.total} indicatoren ingevuld</span>}</li>)}
                </ul>
              </>
            )}
        </div>

        <div className="chart-card">
          <h3>Indicatoren op niveau per schooljaar</h3>
          {data.trend.every((d) => d.pct === null) ? <ChartEmpty>Nog geen indicatoren met een resultaat.</ChartEmpty> : (
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
          <h3>Indicatoren per categorie ({year})</h3>
          {data.perCategory.every((c) => !c.done) ? <ChartEmpty>Nog geen ingevulde indicatoren bij doelen met een signaal in {year}.</ChartEmpty> : (
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
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>De categorie volgt uit de signalen van het doel. Tussen haakjes: ingevulde / alle indicatoren.</p>
            </>
          )}
        </div>

        <div className="chart-card">
          <h3>Acties per status ({year})</h3>
          {data.actionStatus.every((d) => !d.count) ? <ChartEmpty>Nog geen acties in {year}.</ChartEmpty> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.actionStatus} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 0 }} barCategoryGap={12}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} fontSize={12} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--chart-hover)' }} />
                <Bar dataKey="count" name="Acties" fill={CHART.accent} radius={[0, 4, 4, 0]} maxBarSize={32}>
                  <LabelList dataKey="count" position="right" fontSize={12} fill="var(--ink)" formatter={countLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Aandachtspunten</h3>
          <h4 className="dash-sub">Indicatoren onder niveau, zonder actie die nog loopt</h4>
          {data.belowWithoutAction.length === 0 ? <p className="muted">Geen.</p> : (
            <ul className="dash-list">
              {data.belowWithoutAction.map((m) => (
                <li key={m._id}>
                  <button className="link-btn strong" onClick={() => { t.setError(''); setIndicator(m); }}>{m.title}</button>
                  <span className="muted"> · {formatValue(m, m.value)} · {t.goalById[m.goal]?.title}</span>
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

      {indicator && <IndicatorModal indicator={indicator} goal={t.goalById[indicator.goal]} t={t} onClose={() => setIndicator(null)} />}
    </div>
  );
}
