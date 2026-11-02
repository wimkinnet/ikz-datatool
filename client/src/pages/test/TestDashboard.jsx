import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner, ChartEmpty } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { GoalStatus, IndicatorModal, formatValue } from '../../test/TestBits';
import { assessGoal, CHART, GOAL_STATUS, goalDomains, monthPhase, tally } from '../../test/assess';
import { FIRST_GOAL_YEAR, PLAN_MONTHS, TEST_ACTION_STATUSES, TEST_CATEGORIES } from '../../utils/constants';
import { formatDate } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);
// Room for the longest label of a horizontal chart, so names are shown in full
const labelWidth = (rows) => Math.min(460, Math.max(...rows.map((r) => String(r.name).length), 10) * 6.6 + 16);
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

// One stacked column per month of the school year; the tooltip shows how a month is made up
const monthTooltip = (_, p) => {
  const r = p?.[0]?.payload;
  if (!r) return '';
  const parts = [r.indicators && `${r.indicators} indicator${r.indicators === 1 ? '' : 'en'}`, r.actionPoints && `${r.actionPoints} meetpunt${r.actionPoints === 1 ? '' : 'en'} bij acties`].filter(Boolean);
  return `${r.full}${r.phase === 'now' ? ' (deze maand)' : ''}${parts.length ? `: ${parts.join(' en ')}` : ''}`;
};

function MonthChart({ rows, series }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="name" fontSize={12} tickLine={false} interval={0} />
        <YAxis allowDecimals={false} fontSize={12} tickLine={false} />
        <Tooltip cursor={{ fill: 'var(--chart-hover)' }} labelFormatter={monthTooltip} />
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
    const goalBars = goals.map(({ g, a }) => ({ name: g.title, full: g.title, groen: a.groen, zonder: a.zonder, rood: a.rood, status: a.label }));

    // Goal success comes from the indicators, action success from the meetpunten of the actions
    const indicators = t.yearMeetpunten.filter((m) => m.kind === 'indicator');
    const ind = tally(indicators, year);
    const act = tally(t.yearMeetpunten.filter((m) => m.kind === 'actie'), year);

    // A goal's domeinen follow from its signals; its indicators count in each of them
    const domainIds = [...new Set(goals.flatMap(({ g }) => goalDomains(g, t.signals)))];
    const categoryOrder = (id) => TEST_CATEGORIES.findIndex((c) => c.key === t.resultById[id]?.category);
    const perDomain = domainIds.filter((id) => t.resultById[id]).sort((a, b) => categoryOrder(a) - categoryOrder(b)).map((id) => {
      const inDomain = goals.filter(({ g }) => goalDomains(g, t.signals).includes(id));
      const n = tally(inDomain.flatMap(({ g }) => t.indicatorsOf(g._id)), year);
      return { ...n, name: `${t.resultById[id].name} (${n.done}/${n.total})`, full: t.resultById[id].name };
    }).filter((c) => c.total > 0);

    // A goal's indicators count in each ROK-domein its ROK expectations belong to
    const rokDomains = [...new Set(t.rok.map((r) => r.domain))];
    const perRok = rokDomains.map((domain) => {
      const inDomain = goals.filter(({ g }) => (g.rok || []).some((code) => t.rokByCode[code]?.domain === domain));
      const n = tally(inDomain.flatMap(({ g }) => t.indicatorsOf(g._id)), year);
      return { ...n, name: `${domain} (${n.done}/${n.total})`, full: domain };
    }).filter((c) => c.total > 0);

    const openActions = t.yearActions.filter((a) => a.status !== 'uitgevoerd');
    const actionTotal = t.yearActions.length;
    const late = openActions.filter((a) => a.dueDate && a.dueDate.slice(0, 10) < today());
    const actionStatus = TEST_ACTION_STATUSES.map((s) => ({ name: s.label, count: t.yearActions.filter((a) => a.status === s.key).length }));
    // Indicators below level whose goal has no action in progress or still to do
    const belowWithoutAction = indicators.filter((m) => m.beoordeling === 'rood' && !t.actionsOf(m.goal).some((a) => a.status !== 'uitgevoerd'));

    // Everything to measure, per month of the active school year
    const perMonth = PLAN_MONTHS.map((mo, idx) => {
      const list = t.yearMeetpunten.filter((x) => x.month === mo.key);
      const n = tally(list, year);
      const indicators = list.filter((x) => x.kind === 'indicator').length;
      return { ...n, indicators, actionPoints: list.length - indicators, todo: n.now + n.planned, name: MONTH_SHORT[idx], full: mo.label, phase: monthPhase(year, idx) };
    });

    return { perMonth, goals, goalStatusCount, goalBars, ind, act, perDomain, perRok, actionTotal, late, actionStatus, belowWithoutAction };
  }, [t, year]);

  if (!t.schoolId) return <NoSchool />;
  const { ind, act } = data;
  const pct = (n) => (n.groen + n.rood ? `${Math.round((n.groen / (n.groen + n.rood)) * 100)}%` : '—');
  const resultLine = (n, none) => (n.total === 0 ? none : `${n.groen} op niveau · ${n.rood} onder niveau · ${n.total - n.groen - n.rood} nog zonder resultaat`);

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
        <Link to="/doelen" className="stat stat-link">
          <div className="label">Operationele doelen</div>
          <div className="value">{year < FIRST_GOAL_YEAR ? '—' : data.goals.length}</div>
          {data.goals.length > 0 && (
            <div className="stat-sub">{data.goalStatusCount.ok} op koers · {data.goalStatusCount.aandacht} aandacht · {data.goalStatusCount.niet} niet op koers · {data.goalStatusCount.onbekend + data.goalStatusCount.geen} nog geen resultaat</div>
          )}
        </Link>
        <div className="stat">
          <div className="label">Indicatoren bij operationele doelen op niveau</div>
          <div className="value st-ok">{pct(ind)}</div>
          <div className="stat-sub">{resultLine(ind, 'nog geen indicatoren')}</div>
        </div>
        <Link to="/acties" className="stat stat-link">
          <div className="label">Acties</div>
          <div className="value">{data.actionTotal}</div>
          <div className="stat-sub">
            {data.actionStatus.map((x) => `${x.count} ${x.name.toLowerCase()}`).join(' · ')}
            {data.late.length > 0 && <div className="st-actie">{data.late.length} te laat</div>}
          </div>
        </Link>
        <div className="stat">
          <div className="label">Meetpunten bij acties op niveau</div>
          <div className="value st-ok">{pct(act)}</div>
          <div className="stat-sub">{resultLine(act, 'nog geen meetpunten bij acties')}</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card chart-wide">
          <h3>Inschatting per operationeel doel</h3>
          <p className="muted chart-note">Op basis van de indicatoren met een resultaat: minstens 75 % op niveau is <strong>op koers</strong>, 50 tot 75 % is <strong>aandacht</strong>, minder is <strong>niet op koers</strong>. Zonder resultaat is er nog geen inschatting.</p>
          {year < FIRST_GOAL_YEAR ? <ChartEmpty>Operationele doelen starten in {FIRST_GOAL_YEAR}.</ChartEmpty>
            : data.goalBars.length === 0 ? <ChartEmpty>Nog geen operationele doelen voor {year}.</ChartEmpty> : (
              <>
                {data.goals.some(({ a }) => a.done > 0) && (
                  <ResponsiveContainer width="100%" height={Math.max(180, data.goalBars.length * 46 + 60)}>
                    <BarChart data={data.goalBars} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }} barCategoryGap={10}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                      <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={labelWidth(data.goalBars)} fontSize={12} tickLine={false} />
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

        <div className="chart-card chart-wide">
          <h3>Indicatoren per domein ({year})</h3>
          {data.perDomain.every((c) => !c.done) ? <ChartEmpty>Nog geen ingevulde indicatoren bij doelen met een signaal in {year}.</ChartEmpty> : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(180, data.perDomain.length * 50 + 60)}>
                <BarChart data={data.perDomain} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }} barCategoryGap={12}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                  <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={labelWidth(data.perDomain)} fontSize={12} tickLine={false} />
                  <Tooltip cursor={{ fill: 'var(--chart-hover)' }} />
                  <Legend formatter={legendLabel} />
                  {stackBars(RESULT_SERIES)}
                </BarChart>
              </ResponsiveContainer>
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>Het domein volgt uit de signalen van het doel; een doel met signalen in meerdere domeinen telt in elk ervan mee. Tussen haakjes: ingevulde / alle indicatoren.</p>
            </>
          )}
        </div>

        <div className="chart-card chart-wide">
          <h3>Indicatoren per ROK-categorie ({year})</h3>
          {data.perRok.every((c) => !c.done) ? <ChartEmpty>Nog geen ingevulde indicatoren bij doelen met een ROK-koppeling in {year}.</ChartEmpty> : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(180, data.perRok.length * 50 + 60)}>
                <BarChart data={data.perRok} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }} barCategoryGap={12}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                  <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={labelWidth(data.perRok)} fontSize={12} tickLine={false} />
                  <Tooltip cursor={{ fill: 'var(--chart-hover)' }} labelFormatter={(_, p) => (p?.[0] ? p[0].payload.full : '')} />
                  <Legend formatter={legendLabel} />
                  {stackBars(RESULT_SERIES)}
                </BarChart>
              </ResponsiveContainer>
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>De ROK-categorie volgt uit de ROK-koppelingen van het doel. Tussen haakjes: ingevulde / alle indicatoren.</p>
            </>
          )}
        </div>

        <div className="chart-card chart-wide">
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
          <h3>Invulstatus per maand ({year})</h3>
          <p className="muted chart-note">Indicatoren en meetpunten bij acties samen.</p>
          {data.perMonth.every((r) => !r.total) ? <ChartEmpty>Nog niets te meten in {year}.</ChartEmpty> : (
            <>
              <MonthChart rows={data.perMonth} series={FILL_SERIES} />
            </>
          )}
        </div>

        <div className="chart-card">
          <h3>Resultaat per maand ({year})</h3>
          <p className="muted chart-note">Indicatoren en meetpunten bij acties samen, zodra ze ingevuld zijn.</p>
          {data.perMonth.every((r) => !r.done) ? <ChartEmpty>Nog niets ingevuld in {year}.</ChartEmpty> : <MonthChart rows={data.perMonth} series={RESULT_SERIES} />}
        </div>

        <div className="chart-card chart-wide">
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
