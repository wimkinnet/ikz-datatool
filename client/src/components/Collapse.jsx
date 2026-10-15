import { useCallback, useEffect, useRef, useState } from 'react';

// Shared expand/collapse state for long, grouped lists. Keys are group ids (a domain, a month, a goal id …).
// `initial` may be a function of the data; it is applied once, when `ready` first becomes true.
export function useCollapse(initial = [], ready = true) {
  const [open, setOpen] = useState(() => new Set(typeof initial === 'function' ? [] : initial));
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    if (typeof initial === 'function') setOpen(new Set(initial()));
  }, [ready, initial]);

  const isOpen = useCallback((k) => open.has(k), [open]);
  const toggle = useCallback((k) => setOpen((p) => {
    const n = new Set(p);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  }), []);
  const setMany = useCallback((keys, on) => setOpen((p) => {
    const n = new Set(p);
    keys.forEach((k) => (on ? n.add(k) : n.delete(k)));
    return n;
  }), []);
  const expand = useCallback((keys) => setMany(keys, true), [setMany]);
  const collapse = useCallback((keys) => setMany(keys, false), [setMany]);
  const allOpen = (keys) => keys.length > 0 && keys.every((k) => open.has(k));
  return { isOpen, toggle, expand, collapse, allOpen };
}

export function Chevron({ open }) {
  return <span className={`chev ${open ? 'open' : ''}`} aria-hidden="true">▸</span>;
}

// "Alles uitklappen" / "Alles inklappen" for the given keys
export function ToggleAll({ c, keys, className = 'btn btn-sm' }) {
  if (!keys.length) return null;
  const all = c.allOpen(keys);
  return (
    <button type="button" className={className} onClick={() => (all ? c.collapse(keys) : c.expand(keys))}>
      {all ? 'Alles inklappen' : 'Alles uitklappen'}
    </button>
  );
}
