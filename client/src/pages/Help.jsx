import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useCollapse, Chevron, ToggleAll } from '../components/Collapse';
import { HELP_GROUPS, helpArticles, Ref } from '../help/articles';
import { useTest } from '../test/useTest';
import { themeOf } from '../utils/themes';

// Search ignores case and accents, and looks through the text of an article
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const textOf = (node) => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  return textOf(node.props?.children);
};

function ContactLink({ mail }) {
  return <a href={`mailto:${mail}?subject=${encodeURIComponent('Vraag over de IKZ Datatool')}`}>{mail}</a>;
}

// The clickable overview of the model
function HelpSchema() {
  const column = (head, items) => (
    <div className="help-schema-col">
      <span>{head}</span>
      {items.map(([id, label]) => <Link key={id} to={{ hash: `#${id}` }} className="help-schema-item">{label}</Link>)}
    </div>
  );
  return (
    <section className="card help-schema">
      <h2>Hoe het samenhangt</h2>
      <p className="muted">Klik op een onderdeel voor de uitleg.</p>
      <div className="help-schema-row">
        {column('Waarom?', [['signalen', 'Signalen'], ['strategisch', 'Strategische doelen'], ['rok', 'ROK']])}
        <span className="help-schema-arrow" aria-hidden="true">→</span>
        {column('Wat dit schooljaar?', [['doelen', 'Operationele doelen']])}
        <span className="help-schema-arrow" aria-hidden="true">→</span>
        {column('Hoe meten en doen?', [['indicatoren', 'Indicatoren'], ['acties', 'Acties']])}
        <span className="help-schema-arrow" aria-hidden="true">→</span>
        {column('Opvolgen', [['kalender', 'Kalender'], ['dashboard', 'Dashboard']])}
      </div>
    </section>
  );
}

// Where the chosen school stands in the same steps, from its own data
function HelpProgress() {
  const { school, year } = useApp();
  const t = useTest();
  if (!t.schoolId || t.loading) return null;
  const steps = [
    ['signalen', '/signalen', 'Signalen benoemen', t.signals.length],
    ['strategisch', '/strategische-doelen', 'Strategische doelen bepalen', t.strategic.length],
    ['doelen', '/doelen', `Operationele doelen voor ${year}`, t.goals.length],
    ['indicatoren', '/doelen', 'Indicatoren toevoegen', t.yearMeetpunten.filter((m) => m.kind === 'indicator').length],
    ['acties', '/acties', 'Acties plannen', t.yearActions.length],
  ];
  return (
    <section className="card help-progress">
      <h2>Hoe ver staat {school?.name}?</h2>
      <ol>
        {steps.map(([id, to, label, count]) => (
          <li key={id} className={count ? 'done' : ''}>
            <span className="help-check" aria-hidden="true">{count ? '✓' : ''}</span>
            <Link to={to}>{label}</Link>
            <span className="muted">{count || 'nog niet'}</span>
            <Ref id={id}>Uitleg</Ref>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Help() {
  const { user } = useAuth();
  const { readOnly } = useApp();
  const location = useLocation();
  const [q, setQ] = useState('');
  const mail = themeOf(user.theme).contact;
  const articles = useMemo(() => helpArticles({ role: user.role, readOnly, contact: mail }), [user.role, readOnly, mail]);
  const c = useCollapse(['werking']);
  useEffect(() => { if (readOnly) c.expand(['voorbeeldschool']); }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // A link to #artikel opens that article and scrolls to it, also from another page
  const target = location.hash.slice(1);
  useEffect(() => {
    if (!target) return;
    setQ('');
    c.expand([target]);
    const timer = setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    return () => clearTimeout(timer);
  }, [target, location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const words = norm(q).split(/\s+/).filter(Boolean);
  const shown = useMemo(() => {
    if (!words.length) return articles;
    const texts = articles.map((a) => [a, norm(`${a.title} ${a.keywords || ''} ${textOf(a.body)}`)]);
    // The exact phrase first; only without a hit the separate words, in any order
    const phrase = texts.filter(([, text]) => text.includes(words.join(' ')));
    return (phrase.length ? phrase : texts.filter(([, text]) => words.every((w) => text.includes(w)))).map(([a]) => a);
  }, [articles, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const searching = words.length > 0;
  const groups = HELP_GROUPS.map((g) => [g, shown.filter((a) => a.group === g)]).filter(([, list]) => list.length);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Help</h1>
          <p>Alles over de IKZ Datatool. Vind je het antwoord niet? Mail naar <ContactLink mail={mail} />.</p>
        </div>
      </div>

      <div className="toolbar">
        <input type="search" className="input-inline help-search" placeholder="Zoek in de help, bv. drempelwaarde of te laat…" aria-label="Zoek in de help" value={q} onChange={(e) => setQ(e.target.value)} />
        {searching && <span className="muted" aria-live="polite">{shown.length} {shown.length === 1 ? 'resultaat' : 'resultaten'}</span>}
        <span className="spacer" />
        {!searching && <ToggleAll c={c} keys={articles.map((a) => a.id)} />}
      </div>

      {!searching && <><HelpSchema /><HelpProgress /></>}

      <div className={searching ? '' : 'help-layout'}>
        {!searching && (
          <nav className="help-toc" aria-label="Inhoud van de help">
            {groups.map(([g, list]) => (
              <div key={g}>
                <strong>{g}</strong>
                {list.map((a) => <Link key={a.id} to={{ hash: `#${a.id}` }}>{a.title}</Link>)}
              </div>
            ))}
          </nav>
        )}
        <div className="help-articles">
          {groups.map(([g, list]) => (
            <section key={g}>
              <h2>{g}</h2>
              {list.map((a) => {
                const open = searching || c.isOpen(a.id);
                return (
                  <article key={a.id} id={a.id} className={`card help-article ${a.id === target ? 'focus' : ''}`}>
                    <button type="button" className="tree-toggle" aria-expanded={open} disabled={searching} onClick={() => c.toggle(a.id)}>
                      <Chevron open={open} /> <h3>{a.title}</h3>
                    </button>
                    {open && (
                      <div className="help-body">
                        {a.body}
                        {a.to && <Link to={a.to} className="flow-open">{a.toLabel} →</Link>}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          ))}
          {searching && shown.length === 0 && (
            <div className="card empty-state">Niets gevonden voor "{q}". Mail je vraag naar <ContactLink mail={mail} />.</div>
          )}
          <section className="card help-contact">
            <h2>Nog een vraag?</h2>
            <p>Mail naar <ContactLink mail={mail} />. Vermeld gerust je school en op welke pagina je zit.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
