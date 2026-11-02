import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useTest } from '../../test/useTest';
import { ActionModal, Beoordeling, formatValue } from '../../test/TestBits';
import { isFilled } from '../../test/assess';
import { FIRST_GOAL_YEAR, TEST_ACTION_STATUSES, monthLabel } from '../../utils/constants';
import { formatDate } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);
const isLate = (a) => a.status !== 'uitgevoerd' && a.dueDate && a.dueDate.slice(0, 10) < today();

// All actions of the operational goals of the active school year, each with its status and optional meetpunt
export default function Acties() {
  const { school } = useApp();
  const t = useTest();
  const [fStatus, setFStatus] = useState('todo'); // 'todo' = everything not yet carried out
  const [fGoal, setFGoal] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  const count = (s) => t.yearActions.filter((a) => a.status === s).length;
  const lateCount = t.yearActions.filter(isLate).length;

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return t.yearActions
      .filter((a) => (fStatus === 'todo' ? a.status !== 'uitgevoerd' : fStatus === 'late' ? isLate(a) : !fStatus || a.status === fStatus))
      .filter((a) => !fGoal || a.goal === fGoal)
      .filter((a) => !term || [a.title, a.description, a.owner, t.goalById[a.goal]?.title, t.meetpuntOfAction(a._id)?.title].join(' ').toLowerCase().includes(term))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  }, [t, fStatus, fGoal, q]);

  if (!t.schoolId) return <NoSchool />;
  const setStatus = (a, status) => t.run(() => api.put(`/test/actions/${a._id}`, { status }));
  const statBtn = (key, label, value, cls = '') => (
    <button key={key} className={`stat stat-btn ${fStatus === key ? 'active' : ''}`} onClick={() => setFStatus(fStatus === key ? '' : key)}>
      <div className="label">{label}</div><div className={`value ${cls}`}>{value}</div>
    </button>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Acties</h1>
          <p>De acties bij de operationele doelen van {school?.name} in {t.year}. Een actie kan een meetpunt hebben om haar succes te meten.</p>
        </div>
        {t.goals.length > 0 && <button className="btn btn-primary" onClick={() => { t.setError(''); setEdit({ goal: fGoal }); }}>+ Nieuwe actie</button>}
      </div>
      <ErrorBanner message={!edit ? t.error : ''} />

      <div className="stat-grid">
        {TEST_ACTION_STATUSES.map((s) => statBtn(s.key, s.label, count(s.key)))}
        {statBtn('late', 'Te laat', lateCount, lateCount ? 'st-actie' : '')}
      </div>

      <div className="toolbar">
        <select className="select-inline" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="todo">Nog niet uitgevoerd</option>
          <option value="">Alle statussen</option>
          {TEST_ACTION_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          <option value="late">Te laat</option>
        </select>
        <select className="select-inline" value={fGoal} onChange={(e) => setFGoal(e.target.value)} style={{ maxWidth: 320 }}>
          <option value="">Alle operationele doelen</option>
          {t.goals.map((g) => <option key={g._id} value={g._id}>{g.title}</option>)}
        </select>
        <input className="input-inline" placeholder="Zoeken…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        {t.loading ? <p className="muted" style={{ padding: 20 }}>Laden…</p> : list.length === 0 ? (
          <div className="empty-state">
            {t.year < FIRST_GOAL_YEAR ? `Operationele doelen en hun acties starten in ${FIRST_GOAL_YEAR}.`
              : t.goals.length === 0 ? 'Maak eerst een operationeel doel; een actie hoort altijd bij een doel.'
                : t.yearActions.length ? 'Geen acties die aan de filter voldoen.' : 'Nog geen acties.'}
          </div>
        ) : (
          <table className="so-table">
            <thead><tr><th>Status</th><th>Actie</th><th>Operationeel doel</th><th>Meetpunt</th><th>Verantwoordelijke</th><th>Deadline</th></tr></thead>
            <tbody>
              {list.map((a) => {
                const m = t.meetpuntOfAction(a._id);
                return (
                  <tr key={a._id}>
                    <td style={{ width: 150 }}>
                      <select className={`status-select task-${a.status}`} value={a.status} onChange={(e) => setStatus(a, e.target.value)} aria-label="Status">
                        {TEST_ACTION_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="link-btn strong" onClick={() => { t.setError(''); setEdit(a); }}>{a.title}</button>
                      {a.description && <div className="muted" style={{ fontSize: 12 }}>{a.description}</div>}
                    </td>
                    <td><Link to={`/doelen?goal=${a.goal}`}>{t.goalById[a.goal]?.title}</Link></td>
                    <td>
                      {m ? (
                        <>
                          {m.title}
                          <div className="muted" style={{ fontSize: 12 }}>{monthLabel(m.month)}{isFilled(m) && <> · {formatValue(m, m.value)} <Beoordeling value={m.beoordeling} empty="" /></>}</div>
                        </>
                      ) : <span className="muted">geen</span>}
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

      {edit && <ActionModal action={edit} t={t} onClose={() => setEdit(null)} />}
    </div>
  );
}
