import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTest } from '../test/useTest';
import { CategoryTag } from '../test/TestBits';
import { GOAL_RULE } from '../test/assess';
import { TEST_ACTION_STATUSES } from '../utils/constants';

const pct = (x) => `${Math.round(x * 100)}%`;

// One box of the diagram: what it is, who maintains it, how long it lasts, and a link to its page
function Box({ boxRef, code, title, to, linkText, count, kind, who, span, children }) {
  return (
    <article ref={boxRef} className={`flow-box ${kind || ''}`}>
      <header>
        <div>
          {code && <span className="tag">{code}</span>}
          <h3>{title}</h3>
        </div>
        {count !== undefined && <span className="flow-count" title="Aantal bij de gekozen school en het gekozen schooljaar">{count}</span>}
      </header>
      {children}
      <dl>
        {who && <><dt>Wie</dt><dd>{who}</dd></>}
        <dt>Looptijd</dt><dd>{span}</dd>
      </dl>
      <Link to={to} className="flow-open">{linkText} →</Link>
    </article>
  );
}

// The flow of the tool, left to right: signals, strategic goals and the ROK lead to an operational goal,
// and indicators and actions come from it. Arrows are drawn from the measured positions of the boxes.
// School users get a version that doesn't say who does what; consultants and admins can switch to it.
export default function Flow() {
  const { school, year } = useApp();
  const { user } = useAuth();
  const isStaff = user.role !== 'client';
  const [schoolView, setSchoolView] = useState(false);
  const showWho = isStaff && !schoolView;
  const t = useTest();
  const has = !!t.schoolId && !t.loading;
  const wrap = useRef(null);
  const sources = [useRef(null), useRef(null), useRef(null)];
  const goal = useRef(null);
  const results = [useRef(null), useRef(null)];
  const [arrows, setArrows] = useState({ w: 0, h: 0, paths: [] });

  useLayoutEffect(() => {
    const draw = () => {
      const box = wrap.current?.getBoundingClientRect();
      const g = goal.current?.getBoundingClientRect();
      if (!box || !g) return;
      // Stacked on small screens: no arrows, the boxes follow each other
      if (window.matchMedia('(max-width: 1000px)').matches) { setArrows({ w: 0, h: 0, paths: [] }); return; }
      const curve = (x1, y1, x2, y2) => {
        const mid = (x1 + x2) / 2;
        return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
      };
      const gy = g.top + g.height / 2 - box.top;
      const paths = [
        ...sources.map((r) => {
          const b = r.current.getBoundingClientRect();
          return curve(b.right - box.left, b.top + b.height / 2 - box.top, g.left - box.left - 7, gy);
        }),
        ...results.map((r) => {
          const b = r.current.getBoundingClientRect();
          return curve(g.right - box.left, gy, b.left - box.left - 7, b.top + b.height / 2 - box.top);
        }),
      ];
      setArrows({ w: box.width, h: box.height, paths });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap.current);
    window.addEventListener('resize', draw);
    // The boxes change height with the version, and with the counts once they are loaded
    [...sources, goal, ...results].forEach((r) => r.current && ro.observe(r.current));
    return () => { ro.disconnect(); window.removeEventListener('resize', draw); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Flow</h1>
          <p>Hoe de tool werkt: drie vertrekpunten leiden tot een operationeel doel, en daar komen indicatoren en acties uit voort.{has && ` De cijfers zijn die van ${school?.name} (${year}).`}</p>
        </div>
        {isStaff && (
          <div className="flow-switch" role="group" aria-label="Versie van het schema">
            <button type="button" className={`btn btn-sm ${schoolView ? '' : 'active'}`} aria-pressed={!schoolView} onClick={() => setSchoolView(false)}>Volledig</button>
            <button type="button" className={`btn btn-sm ${schoolView ? 'active' : ''}`} aria-pressed={schoolView} onClick={() => setSchoolView(true)}>Voor de school</button>
          </div>
        )}
      </div>

      <div className="flow-heads">
        <div><strong>1. Vertrekpunten</strong><span>Waarom doen we dit?</span></div>
        <div><strong>2. Operationeel doel</strong><span>Wat willen we dit jaar bereiken?</span></div>
        <div><strong>3. Uitwerking</strong><span>Hoe meten we het en wat doen we ervoor?</span></div>
      </div>

      <div className="flow" ref={wrap}>
        <svg className="flow-arrows" width={arrows.w} height={arrows.h} aria-hidden="true">
          <defs>
            <marker id="flow-head" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" className="flow-arrow-head" />
            </marker>
          </defs>
          {arrows.paths.map((d) => <path key={d} d={d} className="flow-arrow" markerEnd="url(#flow-head)" />)}
        </svg>

        <div className="flow-col">
          <Box boxRef={sources[0]} code="Sign-C1, Sign-P1, Sign-R1" title="Signalen" to="/signalen" linkText="Open signalen" count={has ? t.signals.length : undefined} who={showWho && 'Iedereen met toegang tot de school'} span="Over de schooljaren heen">
            <p>Wat valt op bij deze school? Elk signaal is gebaseerd op één domein en vertrekt van een startwaarde.</p>
            <ul>
              <li>Titel en beschrijving</li>
              <li>
                Domein, waarvan de categorie de letter bepaalt:
                <span className="flow-cats">
                  <span><strong>C</strong> <CategoryTag category="context" /></span>
                  <span><strong>P</strong> <CategoryTag category="proces" /></span>
                  <span><strong>R</strong> <CategoryTag category="resultaten" /></span>
                </span>
                {showWho && 'Een consultant of admin kan hier ook een nieuw domein aanmaken.'}
              </li>
              <li>Wat gemeten wordt en de soort waarde</li>
              <li>Startwaarde en haar schooljaar</li>
            </ul>
          </Box>
          <Box boxRef={sources[1]} code="Strat-1, Strat-2" title="Strategische doelen" to="/strategische-doelen" linkText="Open strategische doelen" count={has ? t.strategic.length : undefined} who={showWho && 'Iedereen met toegang tot de school'} span="Over de schooljaren heen">
            <p>Waar wil de school op lange termijn naartoe?</p>
            <ul><li>Titel en beschrijving</li></ul>
          </Box>
          <Box boxRef={sources[2]} code="ROK-R1 … ROK-BL12" title="ROK" to="/rok" linkText="Open ROK" who={showWho && 'Vast referentiekader, voor iedereen hetzelfde'} span="Blijft gelijk">
            <p>Het referentiekader voor onderwijskwaliteit: kwaliteitsverwachtingen, gegroepeerd in ROK-domeinen.</p>
          </Box>
          <p className="flow-note">Een operationeel doel kan aan <strong>geen, één of meerdere</strong> van elk bijdragen.</p>
        </div>

        <div className="flow-col flow-col-center">
          <Box boxRef={goal} kind="flow-goal" title="Operationele doelen" to="/doelen" linkText="Open operationele doelen" count={has ? t.goals.length : undefined} who={showWho && 'Iedereen met toegang tot de school'} span="Eén schooljaar, vanaf 2026-2027">
            <p>Wat wil de school dit schooljaar concreet bereiken?</p>
            <ul>
              <li>Titel en toelichting</li>
              <li><strong>Draagt bij aan</strong> ROK, signalen en strategische doelen</li>
              <li>Domeinen, die volgen uit de gekoppelde signalen</li>
            </ul>
            <div className="flow-rule">
              <strong>Inschatting van het doel</strong>
              <div className="flow-rule-grid">
                <span className="status-pill ok">Op koers</span><span>minstens {pct(GOAL_RULE.opKoers)} van de indicatoren op niveau</span>
                <span className="status-pill monitoren">Aandacht</span><span>{pct(GOAL_RULE.aandacht)} tot {pct(GOAL_RULE.opKoers)}</span>
                <span className="status-pill actie">Niet op koers</span><span>minder dan {pct(GOAL_RULE.aandacht)}</span>
              </div>
              <small>Voorlopig zolang niet alle indicatoren een resultaat hebben. Enkel indicatoren tellen mee, geen acties.</small>
            </div>
          </Box>
        </div>

        <div className="flow-col flow-col-center">
          <Box boxRef={results[0]} kind="flow-indicator" title="Indicatoren" to="/doelen" linkText="Beheren bij de operationele doelen" count={has ? t.yearMeetpunten.filter((m) => m.kind === 'indicator').length : undefined} who={showWho && 'Iedereen met toegang tot de school'} span="Het schooljaar van het doel">
            <p><strong>Meten het succes van het doel.</strong> Een doel heeft er geen, één of meerdere.</p>
            <ul>
              <li>Naam, uitleg en bron</li>
              <li>Maand van de meting</li>
              <li>Soort waarde en eventuele drempelwaarde</li>
              <li>Gemeten waarde en resultaat: op of onder niveau</li>
            </ul>
          </Box>
          <Box boxRef={results[1]} kind="flow-action" title="Acties" to="/acties" linkText="Open acties" count={has ? t.yearActions.length : undefined} who={showWho && 'Iedereen met toegang tot de school'} span="Het schooljaar van het doel">
            <p><strong>Wat de school doet om het doel te bereiken.</strong> Elke actie hoort bij één doel.</p>
            <div className="flow-statuses">
              {TEST_ACTION_STATUSES.map((s) => <span key={s.key} className={`status-pill task-${s.key}`}>{s.label}</span>)}
            </div>
            <ul>
              <li>Titel en beschrijving</li>
              <li>Status, verantwoordelijke en deadline</li>
              <li><strong>Eventueel één meetpunt</strong> dat het succes van de actie meet, met dezelfde velden als een indicator</li>
            </ul>
          </Box>
        </div>
      </div>

      <section className="card flow-example">
        <h2>Voorbeeld</h2>
        <ol>
          <li><span className="tag">Sign-P</span> <strong>Signaal:</strong> ongewettigde afwezigheid neemt toe (startwaarde: 34 leerlingen)</li>
          <li><span className="tag">Strat</span> <strong>Strategisch doel:</strong> welbevinden en aanwezigheid versterken</li>
          <li><span className="tag">ROK</span> <strong>ROK:</strong> de school waarborgt de toegang tot onderwijs voor elke lerende</li>
          <li className="flow-example-goal"><strong>Operationeel doel:</strong> ongewettigde afwezigheid terugdringen</li>
          <li><strong>Indicator:</strong> aantal leerlingen met ongewettigde afwezigheid, gemeten in juni, hoogstens 25</li>
          <li><strong>Actie:</strong> gratis maaltijden aanbieden over de middag, met als meetpunt het aantal leerlingen dat over de middag op school eet</li>
        </ol>
      </section>

      <section className="flow-after">
        <h2>Waar je het daarna terugvindt</h2>
        <div>
          <Link to="/kalender" className="flow-tile"><strong>Kalender</strong><span>Welke indicatoren en meetpunten moeten deze maand gemeten worden, en wat is te laat?</span></Link>
          <Link to="/" className="flow-tile"><strong>Dashboard</strong><span>De inschatting per doel, de indicatoren per domein en ROK-categorie, en de acties per status.</span></Link>
          <Link to="/acties" className="flow-tile"><strong>Acties</strong><span>Alle acties van het schooljaar opvolgen en hun status meteen wijzigen.</span></Link>
        </div>
      </section>
    </div>
  );
}
