import { useEffect, useState } from 'react';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { ErrorBanner } from '../components/Bits';

const date = (d) => new Date(d).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const time = (d) => new Date(d).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });

export default function Logboek() {
  const { schools } = useApp();
  const [data, setData] = useState(null);
  const [school, setSchool] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/visits', { params: school ? { school } : {} }).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [school]);

  const schoolNames = (ids) => ids.map((id) => schools.find((s) => s._id === id)?.name).filter(Boolean).join(', ');
  const needle = q.trim().toLowerCase();
  const shown = (data?.visits || []).filter((v) => !needle || `${v.name} ${v.email}`.toLowerCase().includes(needle));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Logboek</h1>
          <p>Wanneer schoolgebruikers op de site geweest zijn. Een bezoek eindigt na 30 minuten zonder activiteit; bezoeken worden na een jaar automatisch verwijderd.</p>
        </div>
      </div>
      <ErrorBanner message={error} />
      <div className="toolbar">
        <select className="select-inline" value={school} onChange={(e) => setSchool(e.target.value)} style={{ maxWidth: 320 }}>
          <option value="">Alle scholen</option>
          {schools.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <input className="input-inline" placeholder="Zoek een gebruiker…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!data ? (!error && <p className="muted">Laden…</p>) : shown.length === 0 ? (
        <div className="card empty-state"><p>Geen bezoeken gevonden.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Gebruiker</th><th>School(en)</th><th>Datum</th><th>Van</th><th>Tot</th></tr></thead>
            <tbody>
              {shown.map((v) => (
                <tr key={v._id}>
                  <td><strong>{v.name}</strong><div className="muted">{v.email}</div></td>
                  <td>{schoolNames(v.schools)}</td>
                  <td>{date(v.startedAt)}</td>
                  <td>{time(v.startedAt)}</td>
                  <td>{time(v.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.total > data?.visits.length && <p className="muted" style={{ marginTop: 10 }}>De laatste {data.visits.length} van {data.total} bezoeken.</p>}
    </div>
  );
}
