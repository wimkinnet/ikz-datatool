import { useEffect, useMemo, useRef, useState } from 'react';

// Matches on name, city and institution number, ignoring case and accents
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function filterSchools(schools, query) {
  const q = norm(query).trim();
  if (!q) return schools;
  return schools.filter((s) => norm(`${s.name} ${s.city} ${s.institutionNumber}`).includes(q));
}

// Search box + checklist for picking several schools (user form)
export function SchoolMultiSelect({ schools, value, onChange, disabled }) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => filterSchools(schools, query), [schools, query]);
  const nameOf = (id) => schools.find((s) => s._id === id)?.name || 'Onbekende school';
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="school-multi">
      {value.length > 0 && (
        <div className="chips">
          {value.map((id) => (
            <span className="chip" key={id}>
              {nameOf(id)}
              {!disabled && <button type="button" aria-label={`${nameOf(id)} verwijderen`} onClick={() => toggle(id)}>×</button>}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <>
          <input type="search" placeholder="Zoek een school…" value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (shown.length === 1) { toggle(shown[0]._id); setQuery(''); } } }} />
          <div className="school-options">
            {shown.length === 0 ? <div className="muted school-empty">Geen school gevonden.</div> : shown.map((s) => (
              <label className="checkbox-row" key={s._id}>
                <input type="checkbox" checked={value.includes(s._id)} onChange={() => toggle(s._id)} />
                <span>{s.name}{s.city && <span className="muted"> · {s.city}</span>}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Searchable dropdown for the active school (top left of every page)
export function SchoolSwitcher({ schools, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const list = useRef(null);
  const shown = useMemo(() => filterSchools(schools, query), [schools, query]);
  const current = schools.find((s) => s._id === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { list.current?.children[active]?.scrollIntoView({ block: 'nearest' }); }, [active]);

  function toggleOpen() {
    setQuery('');
    setActive(Math.max(0, schools.findIndex((s) => s._id === value)));
    setOpen(!open);
  }
  function pick(s) { onChange(s._id); setOpen(false); }
  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) pick(shown[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="school-switcher" ref={root}>
      <button type="button" className="switcher-btn" onClick={toggleOpen} aria-haspopup="listbox" aria-expanded={open}>
        {current?.name || 'Kies een school'} <span className="caret">▾</span>
      </button>
      {open && (
        <div className="switcher-pop">
          <input type="search" autoFocus placeholder="Zoek een school…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} aria-label="Zoek een school" />
          <ul ref={list} role="listbox">
            {shown.length === 0 && <li className="muted school-empty">Geen school gevonden.</li>}
            {shown.map((s, i) => (
              <li key={s._id} role="option" aria-selected={s._id === value}
                className={`${i === active ? 'active' : ''} ${s._id === value ? 'selected' : ''}`}
                onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(s); }}>
                {s.name}{s.city && <span className="muted"> · {s.city}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
