import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import GoalLinks from '../../components/GoalLinks';
import { useCollapse, Chevron, ToggleAll } from '../../components/Collapse';
import { useTest } from '../../test/useTest';
import { SignalModal, formatValue } from '../../test/TestBits';
import { signalCode } from '../../test/assess';

// Context first: the order of the codes C, P, R
const GROUPS = [
  { key: 'context', label: 'Context' },
  { key: 'proces', label: 'Proces' },
  { key: 'resultaten', label: 'Resultaten' },
];

// The signals of a school: where it starts from, based on a domein and one meetpunt, and which operational goals
// (of any school year) contribute. Consultants and admins maintain them; school users read along.
export default function Signalen() {
  const { school } = useApp();
  const { user } = useAuth();
  const t = useTest();
  const isStaff = user.role !== 'client';
  const [params] = useSearchParams();
  const focus = params.get('signal') || '';
  const [edit, setEdit] = useState(null);
  const c = useCollapse(() => (focus ? [focus] : []), !t.loading);

  useEffect(() => {
    if (!focus || t.loading) return;
    c.expand([focus]);
    setTimeout(() => document.getElementById(`signal-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }, [focus, t.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => GROUPS.map((g) => ({ ...g, items: t.signals.filter((s) => s.category === g.key) })).filter((g) => g.items.length), [t.signals]);

  if (!t.schoolId) return <NoSchool />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Signalen</h1>
          <p>De signalen van {school?.name}, elk gebaseerd op een domein, met hun startwaarde en de operationele doelen die eraan bijdragen.</p>
        </div>
        {isStaff && <button className="btn btn-primary" onClick={() => { t.setError(''); setEdit({}); }}>+ Nieuw signaal</button>}
      </div>
      <ErrorBanner message={!edit ? t.error : ''} />
      {t.signals.length > 1 && <div className="toolbar"><span className="spacer" /><ToggleAll c={c} keys={t.signals.map((s) => s._id)} /></div>}

      {t.loading ? <p className="muted">Laden…</p> : t.signals.length === 0 ? (
        <div className="card empty-state">{isStaff ? 'Nog geen signalen. Voeg het eerste signaal toe.' : 'Er zijn nog geen signalen voor deze school.'}</div>
      ) : groups.map((g) => (
        <section key={g.key} className="signal-group">
          <h2>{g.label}</h2>
          {g.items.map((s) => {
            const open = c.isOpen(s._id);
            const goals = t.allGoals.filter((x) => x.signals?.includes(s._id));
            return (
              <article key={s._id} id={`signal-${s._id}`} className={`card signal-card ${s._id === focus ? 'focus' : ''}`}>
                <div className="tree-head">
                  <button className="tree-toggle" onClick={() => c.toggle(s._id)} aria-expanded={open}>
                    <Chevron open={open} /> <span className="tag">{signalCode(s)}</span> <strong>{s.title}</strong>
                  </button>
                  <span className="tally">{t.resultById[s.domain]?.name}</span>
                  <span className="spacer" />
                  <span className="tally">{goals.length} {goals.length === 1 ? 'operationeel doel' : 'operationele doelen'}</span>
                  {isStaff && <button className="btn btn-sm" onClick={() => { t.setError(''); setEdit(s); }}>Bewerken</button>}
                </div>
                {open && (
                  <div className="signal-body">
                    {s.description && <p>{s.description}</p>}
                    <dl className="signal-facts">
                      <dt>Domein</dt><dd>{t.resultById[s.domain]?.name || '—'}</dd>
                      <dt>Wat gemeten</dt><dd>{s.measure}</dd>
                      <dt>Startwaarde</dt>
                      <dd>{s.startValue === null || s.startValue === '' ? <span className="muted">nog niet ingevuld</span> : <><strong>{formatValue(s, s.startValue)}</strong>{s.startYear && <span className="muted"> · {s.startYear}</span>}</>}</dd>
                    </dl>
                    <h3>Operationele doelen die hieraan bijdragen</h3>
                    <GoalLinks goals={goals} />
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ))}

      {edit && <SignalModal signal={edit} t={t} onClose={() => setEdit(null)} />}
    </div>
  );
}
