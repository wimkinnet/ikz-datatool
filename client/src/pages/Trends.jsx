import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, ReferenceLine } from 'recharts';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { NoSchool, ErrorBanner, ChartEmpty } from '../components/Bits';
import { monthLabel, monthIdx } from '../utils/constants';

// Charts that read straight from the questionnaire: pick a question and see it across school years.
export default function Trends() {
  const { schoolId, year, refLabel } = useApp();
  const [questions, setQuestions] = useState([]);
  const [key, setKey] = useState('');
  const [trend, setTrend] = useState(null);
  const [kind, setKind] = useState('bar');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/questions').then((r) => {
      const usable = r.data.filter((q) => q.answerType !== 'text');
      setQuestions(usable);
      if (usable.length) setKey((k) => k || usable.find((q) => q.text === 'Totaal aantal leerlingen')?.key || usable[0].key);
    }).catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    if (!schoolId || !key) return;
    setTrend(null);
    api.get('/answers/trend', { params: { school: schoolId, questionKey: key } })
      .then((r) => setTrend(r.data)).catch((e) => setError(errMsg(e)));
  }, [schoolId, key]);

  const groups = useMemo(() => {
    const out = [];
    [...questions].sort((a, b) => monthIdx(a.month) - monthIdx(b.month)).forEach((q) => {
      const label = `${monthLabel(q.month)} · ${q.section}`;
      let g = out.find((x) => x.label === label);
      if (!g) out.push((g = { label, items: [] }));
      g.items.push(q);
    });
    return out;
  }, [questions]);

  if (!schoolId) return <NoSchool />;

  const points = (trend?.points || []).filter((p) => p.value !== null);
  const q = trend?.question;
  const unit = q?.answerType === 'percentage' ? '%' : q?.answerType === 'scale10' ? '/10' : '';
  const isScale = !!trend?.scale;
  const yDomain = isScale ? [0, trend.scale.length] : q?.answerType === 'percentage' ? [0, 100] : q?.answerType === 'scale10' ? [0, 10] : [0, 'auto'];
  const fmtTick = (v) => (isScale ? refLabel('inschaling', trend.scale[v - 1]).replace(' de verwachting', '').replace(' verwachting', '') : `${v}${unit}`);
  const Chart = kind === 'line' ? LineChart : BarChart;

  return (
    <div>
      <div className="page-header">
        <div><h1>Trends</h1><p>Vergelijk een indicator over de schooljaren heen. De grafieken volgen automatisch de ingevulde vragenlijst.</p></div>
      </div>
      <ErrorBanner message={error} />

      <div className="toolbar">
        <select className="select-inline" style={{ minWidth: 380, maxWidth: '100%' }} value={key} onChange={(e) => setKey(e.target.value)}>
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((it) => <option key={it.key} value={it.key}>{it.group ? `${it.group.slice(0, 40)} — ` : ''}{it.text.slice(0, 70)}</option>)}
            </optgroup>
          ))}
        </select>
        <select className="select-inline" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="bar">Staafdiagram</option><option value="line">Lijndiagram</option>
        </select>
      </div>

      <div className="chart-card">
        <h3>{q ? q.text : 'Kies een indicator'}</h3>
        {q && <p className="muted" style={{ marginBottom: 6 }}>{monthLabel(q.month)} · {q.section}{q.group ? ` · ${q.group}` : ''}</p>}
        {!trend ? <p className="muted">Laden…</p> : points.length === 0 ? (
          <ChartEmpty>Nog geen ingevulde waarden voor deze vraag. Vul ze in via de Vragenlijst.</ChartEmpty>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <Chart data={points} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="schoolYear" fontSize={12} />
              <YAxis domain={yDomain} allowDecimals={isScale ? false : true} ticks={isScale ? trend.scale.map((_, i) => i + 1) : undefined} tickFormatter={fmtTick} fontSize={12} width={isScale ? 130 : 50} />
              <Tooltip formatter={(v, n, p) => [isScale ? p.payload.label : `${v}${unit}`, q.text.slice(0, 40)]} />
              {points.some((p) => p.schoolYear === year) && kind === 'line' && <ReferenceLine x={year} stroke="#3f6659" strokeDasharray="4 4" />}
              {kind === 'line'
                ? <Line type="monotone" dataKey="value" stroke="#3f6659" strokeWidth={2.5} dot={{ r: 5 }}><LabelList dataKey="value" position="top" formatter={(v) => (isScale ? '' : `${v}${unit}`)} /></Line>
                : <Bar dataKey="value" fill="#3f6659" radius={[4, 4, 0, 0]}><LabelList dataKey="value" position="top" formatter={(v) => (isScale ? '' : `${v}${unit}`)} /></Bar>}
            </Chart>
          </ResponsiveContainer>
        )}
      </div>

      {points.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead><tr><th>Schooljaar</th><th>Waarde</th><th>Verschil met vorig jaar</th></tr></thead>
            <tbody>
              {points.map((p, i) => {
                const prev = points[i - 1];
                const diff = prev && !isScale ? Math.round((p.value - prev.value) * 100) / 100 : null;
                return (
                  <tr key={p.schoolYear}>
                    <td>{p.schoolYear}{p.schoolYear === year && ' (actief)'}</td>
                    <td>{isScale ? refLabel('inschaling', p.label) : `${p.value}${unit}`}</td>
                    <td>{diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff}${unit}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
