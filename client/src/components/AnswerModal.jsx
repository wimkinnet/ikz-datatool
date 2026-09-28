import { useEffect, useState } from 'react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import { useConfirm } from './Confirm';
import { ErrorBanner } from './Bits';
import { formatDate, formatSize } from '../utils/format';

// Comment ("evolutie/opmerkingen"), consultant advice and file attachments for one answer cell.
export default function AnswerModal({ question, year, answer, onClose, onSaved, onAttachmentsChanged }) {
  const { user } = useAuth();
  const { schoolId } = useApp();
  const confirm = useConfirm();
  const isStaff = user.role !== 'client';

  const [comment, setComment] = useState(answer?.comment || '');
  const [note, setNote] = useState(answer?.consultantNote || '');
  const [docs, setDocs] = useState([]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadDocs() {
    const { data } = await api.get('/documents', { params: { school: schoolId, year, questionKey: question.key } });
    setDocs(data);
  }
  useEffect(() => { loadDocs().catch(() => {}); /* eslint-disable-next-line */ }, []);

  async function save() {
    setBusy(true); setError('');
    try {
      const body = { school: schoolId, schoolYear: year, questionKey: question.key, comment };
      if (isStaff) body.consultantNote = note;
      const { data } = await api.put('/answers', body);
      onSaved(data);
      onClose();
    } catch (e) {
      setError(errMsg(e, 'Opslaan mislukt.'));
    } finally { setBusy(false); }
  }

  async function upload(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('school', schoolId); // must come before the file
      fd.append('schoolYear', year);
      fd.append('questionKey', question.key);
      fd.append('category', 'bijlage');
      fd.append('file', file);
      await api.post('/documents', fd);
      setFile(null); e.target.reset();
      await loadDocs(); onAttachmentsChanged();
    } catch (err) {
      setError(errMsg(err, 'Uploaden mislukt.'));
    } finally { setBusy(false); }
  }

  async function download(d) {
    const res = await api.get(`/documents/${d._id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = d.originalName; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  async function remove(d) {
    if (!(await confirm({ title: 'Bestand verwijderen?', message: `"${d.originalName}" wordt definitief verwijderd.` }))) return;
    try { await api.delete(`/documents/${d._id}`); await loadDocs(); onAttachmentsChanged(); }
    catch (err) { setError(errMsg(err)); }
  }

  return (
    <Modal title="Opmerkingen, advies & bijlagen" onClose={onClose} wide>
      <p style={{ marginBottom: 2 }}><strong>{question.text}</strong></p>
      <p className="muted">{question.section}{question.group ? ` · ${question.group}` : ''} · schooljaar {year}</p>
      <ErrorBanner message={error} />

      <div className="field">
        <label>Evolutie / opmerkingen van de school</label>
        <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>

      {(isStaff || note) && (
        <div className="field">
          <label>Advies van de consultant</label>
          {isStaff ? (
            <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Zichtbaar voor de school" />
          ) : (
            <div className="sub-note">{note}</div>
          )}
          {isStaff && <div className="hint">Dit advies is zichtbaar voor de gebruikers van de school.</div>}
        </div>
      )}

      <button className="btn btn-primary" onClick={save} disabled={busy}>Opslaan</button>

      <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '22px 0 14px' }} />
      <h3>Bijlagen</h3>
      {docs.length === 0 ? <p className="muted">Nog geen bijlagen bij deze vraag.</p> : (
        <ul className="file-list">
          {docs.map((d) => (
            <li key={d._id}>
              <span>
                <button className="link-btn" onClick={() => download(d)}>{d.originalName}</button>
                <span className="muted"> · {formatSize(d.size)} · {d.uploadedBy?.name} · {formatDate(d.createdAt)}</span>
              </span>
              {(isStaff || d.uploadedBy?._id === user.id) && <button className="btn btn-sm btn-danger" onClick={() => remove(d)}>Verwijder</button>}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={upload} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button className="btn" type="submit" disabled={!file || busy}>Bijlage toevoegen</button>
      </form>
    </Modal>
  );
}
