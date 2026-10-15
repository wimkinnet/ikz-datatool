import { useMemo, useState } from 'react';
import api from '../../api/axios';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { ActionModal, Beoordeling, formatValue } from '../../test/TestBits';
import { TEST_ACTION_STATUSES } from '../../utils/constants';
import { resultNames } from '../../test/assess';
import { formatDate } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);
const isLate = (a) => a.status !== 'afgerond' && a.dueDate && a.dueDate.slice(0, 10) < today();

// Test: every action linked to a measuring result of the school, to follow them up.
export default function Taken() {
  const { school } = useApp();
  const t = useTest();
  const [fStatus, setFStatus] = useState('todo'); // 'todo' = open + bezig
  const [fYear, setFYear] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  const counts = useMemo(() => ({
    open: t.actions.filter((a) => a.status === 'open').length,
    bezig: t.actions.filter((a) => a.status === 'bezig').length,
    afgerond: t.actions.filter((a) => a.status === 'afgerond').length,
    late: t.actions.filter(isLate).length,
  }), [t.actions]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return t.actions
      .filter((a) => (fStatus === 'todo' ? a.status !== 'afgerond' : fStatus === 'late' ? isLate(a) : !fStatus || a.status === fStatus))
      .filter((a) => !fYear || a.schoolYear === fYear)
      .filter((a) => !term || [a.title, a.description, a.owner, t.meetpuntById[a.meetpunt]?.title].join(' ').toLowerCase().includes(term))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  }, [t.actions, t.meetpuntById, fStatus, fYear, q]);

  if (!t.schoolId) return <NoSchool />;
  const years = [...new Set(t.actions.map((a) => a.schoolYear))].sort();
  const setStatus = (a, status) => t.run(() => api.put(`/test/actions/${a._id}`, { status }));
  const statBtn = (key, label, value, cls = '') => (
    <button className={`stat stat-btn ${fStatus === key ? 'active' : ''}`} onClick={() => setFStatus(fStatus === key ? '' : key)}>
      <div className="label">{label}</div><div className={`value ${cls}`}>{value}</div>
    </button>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Actielijst</h1>
          <p>De acties van {school?.name} bij de meetresultaten. Nieuwe acties voeg je toe bij een meting (Meetpunten of Operationele doelen).</p>
        </div>
      </div>
      <ErrorBanner message={!edit ? t.error : ''} />

      <div className="stat-grid">
        {statBtn('open', 'Open', counts.open)}
        {statBtn('bezig', 'Bezig', counts.bezig, 'st-monitoren')}
        {statBtn('late', 'Te laat', counts.late, 'st-actie')}
        {statBtn('afgerond', 'Afgerond', counts.afgerond, 'st-ok')}
      </div>

      <div className="toolbar">
        <select className="select-inline" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="todo">Nog te doen (open + bezig)</option>
          <option value="">Alle statussen</option>
          {TEST_ACTION_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          <option value="late">Te laat</option>
        </select>
        <select className="select-inline" value={fYear} onChange={(e) => setFYear(e.target.value)}>
          <option value="">Alle schooljaren</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <input className="input-inline" placeholder="Zoek op actie, meetpunt of verantwoordelijke…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        {t.loading ? <p className="muted" style={{ padding: 20 }}>Laden…</p> : list.length === 0 ? (
          <div className="empty-state">{t.actions.length ? 'Geen acties die aan de filter voldoen.' : 'Nog geen acties. Voeg ze toe bij een meting.'}</div>
        ) : (
          <table className="so-table">
            <thead><tr><th>Status</th><th>Actie</th><th>Meetresultaat</th><th>Verantwoordelijke</th><th>Deadline</th></tr></thead>
            <tbody>
              {list.map((a) => {
                const m = t.meetpuntById[a.meetpunt];
                const mt = m && t.metingOf(m._id, a.schoolYear);
                return (
                  <tr key={a._id}>
                    <td style={{ width: 130 }}>
                      <select className={`status-select task-${a.status}`} value={a.status} onChange={(e) => setStatus(a, e.target.value)} aria-label="Status">
                        {TEST_ACTION_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="link-btn strong" onClick={() => { t.setError(''); setEdit(a); }}>{a.title}</button>
                      {a.description && <div className="muted" style={{ fontSize: 12 }}>{a.description}</div>}
                    </td>
                    <td>
                      {m ? <>{m.title} <span className="muted">· {resultNames(m, t.resultById)}</span></> : <span className="muted">—</span>}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {a.schoolYear}{mt && <> · {formatValue(m, mt.value)} <Beoordeling value={mt.beoordeling} empty="" /></>}
                      </div>
                    </td>
                    <td>{a.owner || '—'}</td>
                    <td className={isLate(a) ? 'late' : ''}>{a.dueDate ? formatDate(a.dueDate) : '—'}{isLate(a) && <div style={{ fontSize: 12 }}>te laat</div>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {edit && t.meetpuntById[edit.meetpunt] && (
        <ActionModal action={edit} meetpunt={t.meetpuntById[edit.meetpunt]} schoolYear={edit.schoolYear} t={t} onClose={() => setEdit(null)} />
      )}
    </div>
  );
}
