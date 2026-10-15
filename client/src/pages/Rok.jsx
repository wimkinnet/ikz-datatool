import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { ErrorBanner } from '../components/Bits';
import { useCollapse, Chevron, ToggleAll } from '../components/Collapse';
import { FIRST_GOAL_YEAR } from '../utils/constants';

// The ROK (referentiekader voor onderwijskwaliteit): every domain and quality expectation with its explanation.
// In the Test tab it also lists the active school's operational goals per expectation. ?code=R1 opens one.
export default function Rok() {
  const { sector, schoolId, school, year } = useApp();
  const [params] = useSearchParams();
  const focus = params.get('code') || '';
  const [rok, setRok] = useState([]);
  const [goals, setGoals] = useState([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const focusRef = useRef(null);
  const withGoals = sector === 'TEST' && schoolId && year >= FIRST_GOAL_YEAR;

  useEffect(() => {
    api.get('/so/rok').then((r) => setRok(r.data)).catch((e) => setError(errMsg(e, 'Kon het ROK niet laden.')));
  }, []);
  useEffect(() => {
    if (!withGoals) { setGoals([]); return; }
    api.get('/test/goals', { params: { school: schoolId, year } }).then((r) => setGoals(r.data)).catch(() => setGoals([]));
  }, [withGoals, schoolId, year]);

  const goalsOf = useMemo(() => {
    const map = {};
    for (const g of goals) for (const c of g.rok) (map[c] = map[c] || []).push(g);
    return map;
  }, [goals]);

  const domains = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = [];
    for (const r of rok) {
      if (term && ![r.code, r.title, r.description].join(' ').toLowerCase().includes(term)) continue;
      let d = out.find((x) => x.domain === r.domain);
      if (!d) out.push((d = { domain: r.domain, items: [] }));
      d.items.push(r);
    }
    return out;
  }, [rok, q]);

  const domainKeys = domains.map((d) => `d:${d.domain}`);
  const allKeys = [...domainKeys, ...domains.flatMap((d) => d.items.map((r) => r.code))];
  // Opens the requested expectation (and its domain), or only the domains when nothing is requested
  const c = useCollapse(() => {
    const target = rok.find((r) => r.code === focus);
    return target ? [`d:${target.domain}`, target.code] : [];
  }, rok.length > 0);

  // Searching opens every match; a requested code is scrolled into view
  useEffect(() => { if (q.trim()) c.expand(allKeys); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!focus || !rok.length) return;
    const target = rok.find((r) => r.code === focus);
    if (target) c.expand([`d:${target.domain}`, target.code]);
    setTimeout(() => focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }, [focus, rok.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>ROK</h1>
          <p>
            Het referentiekader voor onderwijskwaliteit: alle kwaliteitsverwachtingen per domein.
            {withGoals && ` Per verwachting zie je de operationele doelen van ${school?.name} voor ${year}.`}
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />
      <div className="toolbar">
        <input className="input-inline" placeholder="Zoek op code of tekst…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="spacer" />
        <ToggleAll c={c} keys={allKeys} />
      </div>

      {domains.length === 0 ? <div className="card empty-state">{rok.length ? 'Geen verwachtingen die aan de zoekterm voldoen.' : 'Laden…'}</div> : domains.map((d) => {
        const dKey = `d:${d.domain}`;
        const dOpen = c.isOpen(dKey);
        const linkedInDomain = new Set(d.items.flatMap((r) => (goalsOf[r.code] || []).map((g) => g._id))).size;
        return (
          <section key={d.domain} className="rok-domain-block">
            <div className="rok-domain-head">
              <button className="tree-toggle" onClick={() => c.toggle(dKey)} aria-expanded={dOpen}>
                <Chevron open={dOpen} /> {d.domain}
              </button>
              <span className="tally">
                <span>{d.items.length} verwachting{d.items.length === 1 ? '' : 'en'}</span>
                {withGoals && <span>· {linkedInDomain} doel{linkedInDomain === 1 ? '' : 'en'}</span>}
              </span>
              <span className="spacer" />
              <ToggleAll c={c} keys={[dKey, ...d.items.map((r) => r.code)]} className="btn btn-sm tree-all" />
            </div>
            {dOpen && d.items.map((r) => {
              const open = c.isOpen(r.code);
              const linked = goalsOf[r.code] || [];
              return (
                <article key={r.code} id={`rok-${r.code}`} ref={r.code === focus ? focusRef : null} className={`rok-item ${r.code === focus ? 'focus' : ''}`}>
                  <button className="tree-toggle rok-item-head" onClick={() => c.toggle(r.code)} aria-expanded={open}>
                    <Chevron open={open} /> <span className="tag">{r.code}</span> <strong>{r.title}</strong>
                    {withGoals && linked.length > 0 && <span className="rok-goal-count">{linked.length} doel{linked.length === 1 ? '' : 'en'}</span>}
                  </button>
                  {open && (
                    <div className="rok-item-body">
                      {r.description && <p>{r.description}</p>}
                      {withGoals && (
                        <div className="rok-goals">
                          <div className="muted rok-domain">Operationele doelen die hieraan bijdragen</div>
                          {linked.length === 0 ? <p className="muted" style={{ margin: 0 }}>Nog geen.</p> : (
                            <ul>{linked.map((g) => <li key={g._id}><Link to={`/?goal=${g._id}`}>{g.title}</Link></li>)}</ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
