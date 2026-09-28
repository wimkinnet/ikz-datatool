import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { NoSchool, ErrorBanner, ChartEmpty } from '../components/Bits';
import { STATUS, STATUS_KEYS, MONTHS, monthLabel, INSCHALING_COLORS } from '../utils/constants';

export default function Overzicht() {
  const { user } = useAuth();
  const { schoolId, school, year, refList } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setError('');
    try {
      const { data } = await api.get('/dashboard', { params: { school: schoolId, year } });
      setData(data);
    } catch (e) { setError(errMsg(e, 'Kon het overzicht niet laden.')); }
  }
  useEffect(() => { if (schoolId) { setData(null); load(); } /* eslint-disable-next-line */ }, [schoolId, year]);

  if (!schoolId) return <NoSchool />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return <p className="muted">Laden…</p>;

  async function applyTemplate() {
    setBusy(true);
    try { await api.post('/plan/apply-template', { school: schoolId, schoolYear: year }); await load(); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  }

  const { totals, perMonth, perRok, perInschaling, progress, actions } = data;
  const monthData = perMonth.map((m) => ({ ...m, name: monthLabel(m.month).slice(0, 3) }));
  const statusData = STATUS_KEYS.map((k) => ({ key: k, name: STATUS[k].label, value: totals[k] || 0, color: STATUS[k].color })).filter((d) => d.value > 0);
  const inschalingOrder = refList('inschaling').map((i) => i.key);
  const inschalingData = perInschaling
    .map((d) => ({ name: d.key, value: d.count, color: INSCHALING_COLORS[Math.max(0, inschalingOrder.indexOf(d.key))] || '#999' }))
    .sort((a, b) => inschalingOrder.indexOf(a.name) - inschalingOrder.indexOf(b.name));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Overzicht {year}</h1>
          <p>{school?.name} — stand van zaken van het jaarplan en de vragenlijst.</p>
        </div>
      </div>

      {totals.tasks === 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2>Nog geen jaarplan voor {year}</h2>
          {user.role !== 'client' ? (
            <>
              <p className="muted">Start met het standaard jaarplan (taken per maand, ROK-domeinen en bronnen) en pas het daarna aan voor deze school.</p>
              <button className="btn btn-primary" onClick={applyTemplate} disabled={busy}>Standaard jaarplan toepassen</button>
            </>
          ) : (
            <p className="muted">Je consultant heeft het jaarplan voor dit schooljaar nog niet klaargezet.</p>
          )}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat"><div className="label">Taken in jaarplan</div><div className="value">{totals.tasks}</div></div>
        <div className="stat"><div className="label">Ok</div><div className="value" style={{ color: STATUS.ok.color }}>{totals.ok} <small style={{ fontSize: 13 }}>({totals.percentOk}%)</small></div></div>
        <div className="stat"><div className="label">Monitoren</div><div className="value" style={{ color: STATUS.monitoren.color }}>{totals.monitoren}</div></div>
        <div className="stat"><div className="label">Actie nodig</div><div className="value" style={{ color: STATUS.actie.color }}>{totals.actie}</div></div>
        <div className="stat"><div className="label">Vragenlijst ingevuld</div><div className="value">{progress.percent}%</div></div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Aantal taken per maand</h3>
          {totals.tasks === 0 ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend />
                {STATUS_KEYS.map((k) => <Bar key={k} dataKey={k} name={STATUS[k].label} stackId="s" fill={STATUS[k].color} />)}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Status van de taken</h3>
          {statusData.length === 0 ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2} label={(d) => d.value}>
                  {statusData.map((d) => <Cell key={d.key} fill={d.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Verdeling taken per ROK-domein</h3>
          {perRok.length === 0 ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={Math.max(220, perRok.length * 24 + 30)}>
              <BarChart data={perRok} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="key" width={44} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" name="Taken" fill="#3f6659" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Inschaling t.o.v. de verwachting</h3>
          {inschalingData.length === 0 ? <ChartEmpty>Vul de kolom “inschaling” in het jaarplan in om deze grafiek te vullen.</ChartEmpty> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={inschalingData} dataKey="value" nameKey="name" outerRadius={95} label={(d) => d.value}>
                  {inschalingData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Voortgang vragenlijst</h3>
          {MONTHS.map((m) => {
            const p = progress.perMonth.find((x) => x.month === m.key) || { total: 0, answered: 0 };
            const pct = p.total ? Math.round((p.answered / p.total) * 100) : 0;
            return (
              <div className="progress-row" key={m.key} style={{ cursor: 'pointer' }} onClick={() => navigate(`/vragenlijst?maand=${m.key}`)}>
                <div className="label">{m.label}</div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                <div className="count">{p.answered}/{p.total}</div>
              </div>
            );
          })}
        </div>

        <div className="chart-card">
          <h3>Acties die aandacht vragen</h3>
          {actions.length === 0 ? <ChartEmpty>Geen taken met status “actie nodig”. 🎉</ChartEmpty> : (
            <table>
              <tbody>
                {actions.map((a) => (
                  <tr key={a._id}>
                    <td style={{ width: 90, textTransform: 'capitalize' }}>{monthLabel(a.month)}</td>
                    <td><strong>{a.theme || '(zonder thema)'}</strong>{a.action && <div className="muted">{a.action}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: 8 }}><Link to="/jaarplan">Naar het jaarplan →</Link></p>
        </div>
      </div>
    </div>
  );
}
