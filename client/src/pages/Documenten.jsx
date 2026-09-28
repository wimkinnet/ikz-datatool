import { useEffect, useMemo, useState, useCallback } from 'react';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { NoSchool, ErrorBanner } from '../components/Bits';
import { useConfirm } from '../components/Confirm';
import { formatDate, formatSize } from '../utils/format';
import { yearOptions, monthLabel } from '../utils/constants';

const CAT = { bijlage: 'Bijlage bij vraag', rapport: 'Rapport', overig: 'Overig' };

export default function Documenten() {
  const { user } = useAuth();
  const { schoolId, year } = useApp();
  const confirm = useConfirm();
  const [docs, setDocs] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filterYear, setFilterYear] = useState('');
  const [file, setFile] = useState(null);
  const [upYear, setUpYear] = useState(year);
  const [category, setCategory] = useState('rapport');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) return;
    try {
      const { data } = await api.get('/documents', { params: { school: schoolId, year: filterYear || undefined } });
      setDocs(data);
    } catch (e) { setError(errMsg(e)); }
  }, [schoolId, filterYear]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setUpYear(year); }, [year]);
  useEffect(() => { api.get('/questions').then((r) => setQuestions(r.data)).catch(() => {}); }, []);
  const qByKey = useMemo(() => Object.fromEntries(questions.map((q) => [q.key, q])), [questions]);

  if (!schoolId) return <NoSchool />;

  async function upload(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('school', schoolId); // first, so the server can pick the right folder
      fd.append('schoolYear', upYear);
      fd.append('category', category);
      fd.append('notes', notes);
      fd.append('file', file);
      await api.post('/documents', fd);
      setFile(null); setNotes(''); e.target.reset();
      load();
    } catch (err) { setError(errMsg(err, 'Uploaden mislukt.')); }
    finally { setBusy(false); }
  }

  async function download(d) {
    try {
      const res = await api.get(`/documents/${d._id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = d.originalName; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { setError(errMsg(err, 'Downloaden mislukt.')); }
  }

  async function remove(d) {
    if (!(await confirm({ title: 'Bestand verwijderen?', message: `"${d.originalName}" wordt definitief verwijderd.` }))) return;
    try { await api.delete(`/documents/${d._id}`); load(); } catch (err) { setError(errMsg(err)); }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Documenten</h1><p>Rapporten en bijlagen van deze school. Bijlagen bij een vraag vind je ook hier terug.</p></div>
      </div>
      <ErrorBanner message={error} />

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Document toevoegen</h3>
        <form onSubmit={upload} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}><label>Bestand</label><input type="file" onChange={(e) => setFile(e.target.files[0])} /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Schooljaar</label>
            <select value={upYear} onChange={(e) => setUpYear(e.target.value)}>{yearOptions().map((y) => <option key={y}>{y}</option>)}</select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}><label>Type</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}><option value="rapport">Rapport</option><option value="overig">Overig</option></select>
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}><label>Opmerking</label><input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <button className="btn btn-primary" type="submit" disabled={!file || busy}>{busy ? 'Uploaden…' : 'Uploaden'}</button>
        </form>
      </div>

      <div className="toolbar">
        <select className="select-inline" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
          <option value="">Alle schooljaren</option>
          {yearOptions().map((y) => <option key={y}>{y}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        {docs.length === 0 ? <div className="empty-state">Nog geen documenten.</div> : (
          <table>
            <thead><tr><th>Bestand</th><th>Type</th><th>Schooljaar</th><th>Bij vraag</th><th>Toegevoegd</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => {
                const q = qByKey[d.questionKey];
                const canDelete = user.role !== 'client' || d.uploadedBy?._id === user.id;
                return (
                  <tr key={d._id}>
                    <td><button className="link-btn" onClick={() => download(d)}>{d.originalName}</button><div className="muted">{formatSize(d.size)}{d.notes ? ` · ${d.notes}` : ''}</div></td>
                    <td><span className="badge">{CAT[d.category]}</span></td>
                    <td>{d.schoolYear || '—'}</td>
                    <td style={{ maxWidth: 260 }}>{q ? <><span className="muted">{monthLabel(q.month)} · </span>{q.text}</> : '—'}</td>
                    <td>{formatDate(d.createdAt)}<div className="muted">{d.uploadedBy?.name}</div></td>
                    <td style={{ textAlign: 'right' }}>{canDelete && <button className="btn btn-sm btn-danger" onClick={() => remove(d)}>Verwijder</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
