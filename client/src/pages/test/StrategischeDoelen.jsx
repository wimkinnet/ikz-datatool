import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import GoalLinks from '../../components/GoalLinks';
import { useCollapse, Chevron, ToggleAll } from '../../components/Collapse';
import { useTest } from '../../test/useTest';
import { StrategicModal } from '../../test/TestBits';
import { strategicCode } from '../../test/assess';

// The strategic goals of a school (S1, S2, ...) and the operational goals (of any school year) that contribute.
// Consultants and admins maintain them; school users read along.
export default function StrategischeDoelen() {
  const { school } = useApp();
  const { user } = useAuth();
  const t = useTest();
  const isStaff = user.role !== 'client';
  const [params] = useSearchParams();
  const focus = params.get('doel') || '';
  const [edit, setEdit] = useState(null);
  const c = useCollapse(() => (focus ? [focus] : []), !t.loading);

  useEffect(() => {
    if (!focus || t.loading) return;
    c.expand([focus]);
    setTimeout(() => document.getElementById(`strategic-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }, [focus, t.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t.schoolId) return <NoSchool />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Strategische doelen</h1>
          <p>De strategische doelen van {school?.name}, met de operationele doelen die eraan bijdragen.</p>
        </div>
        {isStaff && <button className="btn btn-primary" onClick={() => { t.setError(''); setEdit({}); }}>+ Nieuw strategisch doel</button>}
      </div>
      <ErrorBanner message={!edit ? t.error : ''} />
      {t.strategic.length > 1 && <div className="toolbar"><span className="spacer" /><ToggleAll c={c} keys={t.strategic.map((s) => s._id)} /></div>}

      {t.loading ? <p className="muted">Laden…</p> : t.strategic.length === 0 ? (
        <div className="card empty-state">{isStaff ? 'Nog geen strategische doelen. Voeg het eerste toe.' : 'Er zijn nog geen strategische doelen voor deze school.'}</div>
      ) : t.strategic.map((s) => {
        const open = c.isOpen(s._id);
        const goals = t.allGoals.filter((x) => x.strategic?.includes(s._id));
        return (
          <article key={s._id} id={`strategic-${s._id}`} className={`card signal-card ${s._id === focus ? 'focus' : ''}`}>
            <div className="tree-head">
              <button className="tree-toggle" onClick={() => c.toggle(s._id)} aria-expanded={open}>
                <Chevron open={open} /> <span className="tag">{strategicCode(s)}</span> <strong>{s.title}</strong>
              </button>
              <span className="spacer" />
              <span className="tally">{goals.length} {goals.length === 1 ? 'operationeel doel' : 'operationele doelen'}</span>
              {isStaff && <button className="btn btn-sm" onClick={() => { t.setError(''); setEdit(s); }}>Bewerken</button>}
            </div>
            {open && (
              <div className="signal-body">
                {s.description && <p>{s.description}</p>}
                <h3>Operationele doelen die hieraan bijdragen</h3>
                <GoalLinks goals={goals} />
              </div>
            )}
          </article>
        );
      })}

      {edit && <StrategicModal goal={edit} t={t} onClose={() => setEdit(null)} />}
    </div>
  );
}
