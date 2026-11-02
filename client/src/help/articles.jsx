import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GOAL_RULE, goalVerdict } from '../test/assess';
import { CategoryTag } from '../test/TestBits';
import { TEST_ACTION_STATUSES } from '../utils/constants';

const pct = (x) => `${Math.round(x * 100)}%`;

// A link to another article on the help page
export const Ref = ({ id, children }) => <Link to={{ hash: `#${id}` }}>{children}</Link>;

// Try-out of the goal assessment, on the same rule as the rest of the tool
function GoalCalculator() {
  const [n, setN] = useState({ groen: 3, rood: 1, zonder: 1 });
  const field = (key, label) => (
    <label>
      {label}
      <input type="number" min="0" max="99" value={n[key]} onChange={(e) => setN({ ...n, [key]: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })} />
    </label>
  );
  const v = goalVerdict(n.groen, n.rood, n.groen + n.rood + n.zonder);
  return (
    <div className="help-try">
      <strong>Probeer het zelf</strong>
      <div className="help-try-fields">
        {field('groen', 'Op niveau')}
        {field('rood', 'Onder niveau')}
        {field('zonder', 'Nog zonder resultaat')}
      </div>
      <p aria-live="polite">
        <span className={`status-pill ${v.cls}`}>{v.label}</span>
        {v.provisional && <span className="muted"> · voorlopig</span>}
        {v.measured > 0 && <span> {n.groen} van de {v.measured} beoordeelde indicatoren is op niveau: {pct(v.ratio)}.</span>}
      </p>
    </div>
  );
}

// The articles, in order per group. `roles` limits who sees one; `show` depends on the situation.
// Bodies are ordinary elements, so the search on the help page can read their text.
export const HELP_GROUPS = ['Starten', 'De onderdelen', 'Begrippen', 'Veelgestelde vragen', 'Beheer'];

export function helpArticles({ role, readOnly, contact }) {
  const isStaff = role !== 'client';
  const isAdmin = role === 'admin';
  return [
    // ------------------------------------------------------------ Starten
    {
      id: 'werking', group: 'Starten', title: 'Hoe de tool werkt', to: '/flow', toLabel: 'Open de flow',
      body: (
        <>
          <p>De IKZ Datatool volgt de interne kwaliteitszorg van een school op, van vaststelling tot resultaat:</p>
          <ol>
            <li><Ref id="signalen">Signalen</Ref>, <Ref id="strategisch">strategische doelen</Ref> en het <Ref id="rok">ROK</Ref> zijn de vertrekpunten: waarom doen we dit?</li>
            <li>Een <Ref id="doelen">operationeel doel</Ref> zegt wat de school dit schooljaar concreet wil bereiken.</li>
            <li><Ref id="indicatoren">Indicatoren</Ref> meten of dat lukt en <Ref id="acties">acties</Ref> zijn wat de school ervoor doet.</li>
          </ol>
          <p>De <Ref id="kalender">kalender</Ref> toont wanneer er gemeten moet worden en het <Ref id="dashboard">dashboard</Ref> geeft het overzicht.</p>
        </>
      ),
    },
    {
      id: 'kiezen', group: 'Starten', title: 'School en schooljaar kiezen', keywords: 'schoolkeuze wisselen',
      body: (
        <>
          <p><strong>School:</strong> heb je toegang tot meer dan één school, dan kies je ze linksboven. Alle pagina's tonen daarna de gegevens van die school.</p>
          <p><strong>Schooljaar:</strong> dat kies je rechtsboven.</p>
          <ul>
            <li>Operationele doelen, indicatoren en acties horen bij één schooljaar. Dat geldt dus ook voor het dashboard en de kalender.</li>
            <li>Signalen en strategische doelen gelden over de schooljaren heen en blijven dus staan als je van jaar wisselt.</li>
            <li>Operationele doelen starten in 2026-2027.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'profiel', group: 'Starten', title: 'Mijn profiel en wachtwoord', to: '/profiel', toLabel: 'Open mijn profiel', keywords: 'aanmelden afmelden inloggen telefoon naam',
      body: (
        <>
          <p>Onder <strong>Mijn profiel</strong>, links onderaan, wijzig je je naam, telefoonnummer en wachtwoord. Voor een nieuw wachtwoord heb je je huidige wachtwoord nodig, en het moet minstens 8 tekens hebben.</p>
          <p>Je blijft op een toestel maximaal 14 dagen aangemeld. Werk je op een gedeeld toestel, kies dan <strong>Afmelden</strong> als je klaar bent.</p>
          {isAdmin && <p>Als admin kies je hier ook de <Ref id="huisstijl">stijl van de tool</Ref>.</p>}
        </>
      ),
    },
    {
      id: 'voorbeeldschool', group: 'Starten', title: 'De voorbeeldschool', show: readOnly || isStaff, keywords: 'teaser dummy alleen lezen bekijken',
      body: isStaff ? (
        <>
          <p>Een voorbeeldschool laat scholen de tool ontdekken met voorbeeldgegevens. Schoolgebruikers zien alles maar kunnen niets wijzigen. Consultants en admins werken er gewoon in, en wat zij wijzigen is zichtbaar voor iedereen die aan de school gekoppeld is.</p>
          {isAdmin ? <p>Je stelt het in bij de <Ref id="scholen">school</Ref> met het vinkje <strong>Voorbeeldschool</strong>.</p> : <p>Een admin stelt in welke school een voorbeeldschool is.</p>}
        </>
      ) : (
        <>
          <p>Je bekijkt een voorbeeldschool met voorbeeldgegevens. Je ziet hoe de tool werkt, maar kan hier niets toevoegen, wijzigen of verwijderen. Daarom zie je "Bekijken" in plaats van "Bewerken" en geen knoppen om iets nieuws aan te maken.</p>
          <p>Wil je de tool voor je eigen school gebruiken? Mail naar <a href={`mailto:${contact}`}>{contact}</a>.</p>
        </>
      ),
    },

    // ------------------------------------------------------------ De onderdelen
    {
      id: 'flow', group: 'De onderdelen', title: 'Flow', to: '/flow', toLabel: 'Open de flow', keywords: 'schema diagram',
      body: (
        <>
          <p>Een schema van de tool: de vertrekpunten leiden tot een operationeel doel, en daar komen indicatoren en acties uit voort. Bij elk blok staat wat erin zit, hoe lang het loopt en hoeveel je er al hebt bij de gekozen school en het gekozen schooljaar. Onderaan staat een uitgewerkt voorbeeld.</p>
          {isStaff && <p>Met de knoppen <strong>Volledig</strong> en <strong>Voor de school</strong> wissel je tussen het schema met en zonder wie wat doet. Schoolgebruikers zien altijd de versie voor de school.</p>}
        </>
      ),
    },
    {
      id: 'dashboard', group: 'De onderdelen', title: 'Dashboard', to: '/', toLabel: 'Open het dashboard', keywords: 'overzicht grafiek tegels aandachtspunten startpagina',
      body: (
        <>
          <p>De startpagina: hoe staan de doelen, indicatoren en acties ervoor in het gekozen schooljaar?</p>
          <ul>
            <li><strong>Tegels:</strong> het aantal doelen en acties, en het aandeel indicatoren en meetpunten op niveau. Klik op de tegel van de doelen of de acties om ze te openen.</li>
            <li><strong>Grafieken:</strong> de <Ref id="inschatting">inschatting</Ref> per doel, de indicatoren per domein en per ROK-categorie, de acties per status, en de <Ref id="invulstatus">invulstatus</Ref> en het resultaat per maand.</li>
            <li><strong>Aandachtspunten:</strong> indicatoren onder niveau zonder actie die nog loopt, en acties die te laat zijn.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'signalen', group: 'De onderdelen', title: 'Signalen', to: '/signalen', toLabel: 'Open signalen', keywords: 'startwaarde vaststelling Sign',
      body: (
        <>
          <p>Een signaal is iets wat opvalt bij de school en wat je wil opvolgen, bijvoorbeeld "ongewettigde afwezigheid neemt toe". Een signaal blijft over de schooljaren heen bestaan.</p>
          <p>Je vult in:</p>
          <ul>
            <li>een titel en beschrijving;</li>
            <li>het <Ref id="domeinen">domein</Ref> waarop het gebaseerd is;</li>
            <li>wat gemeten wordt en de soort waarde: percentage, absoluut getal of vrije tekst;</li>
            <li>de startwaarde en het schooljaar van die startwaarde.</li>
          </ul>
          <p>Bij elk signaal zie je welke operationele doelen eraan bijdragen, in alle schooljaren.</p>
        </>
      ),
    },
    {
      id: 'strategisch', group: 'De onderdelen', title: 'Strategische doelen', to: '/strategische-doelen', toLabel: 'Open strategische doelen', keywords: 'lange termijn Strat',
      body: <p>Waar wil de school op lange termijn naartoe? Een strategisch doel heeft een titel en een beschrijving, geldt over de schooljaren heen en krijgt automatisch een code: Strat-1, Strat-2, enzovoort.</p>,
    },
    {
      id: 'rok', group: 'De onderdelen', title: 'ROK', to: '/rok', toLabel: 'Open het ROK', keywords: 'referentiekader onderwijskwaliteit kwaliteitsverwachting',
      body: <p>Het referentiekader voor onderwijskwaliteit: alle kwaliteitsverwachtingen per ROK-domein, met hun toelichting. Het is voor iedereen hetzelfde en je kan zoeken op code of tekst. Per verwachting zie je de operationele doelen van de school die eraan bijdragen in het gekozen schooljaar.</p>,
    },
    {
      id: 'doelen', group: 'De onderdelen', title: 'Operationele doelen', to: '/doelen', toLabel: 'Open operationele doelen', keywords: 'draagt bij aan koppelen',
      body: (
        <>
          <p>Wat wil de school dit schooljaar concreet bereiken? Een operationeel doel heeft een titel en toelichting en hoort bij één schooljaar, vanaf 2026-2027.</p>
          <p>Bij <strong>Draagt bij aan</strong> koppel je het doel aan ROK-verwachtingen, signalen en strategische doelen: geen, één of meerdere van elk. De domeinen van het doel volgen uit de gekoppelde signalen.</p>
          <p>Klik op een doel om het open te klappen. Daar voeg je met <strong>+ indicator</strong> en <strong>+ actie</strong> de uitwerking toe. Bovenaan het doel staat de <Ref id="inschatting">inschatting</Ref>.</p>
        </>
      ),
    },
    {
      id: 'indicatoren', group: 'De onderdelen', title: 'Indicatoren', to: '/doelen', toLabel: 'Open operationele doelen', keywords: 'meten meting drempelwaarde bron gemeten waarde opmerking analyse',
      body: (
        <>
          <p>Een indicator meet het succes van een operationeel doel. Je maakt ze aan bij het doel en een doel kan er meerdere hebben. Je vult in:</p>
          <ul>
            <li>de naam, uitleg en bron;</li>
            <li>de maand van de meting;</li>
            <li>de soort waarde en eventueel een drempelwaarde.</li>
          </ul>
          <p>Is de maand daar, dan vul je de gemeten waarde, het <Ref id="resultaat">resultaat</Ref> en eventueel een opmerking of analyse in. De <Ref id="kalender">kalender</Ref> toont wanneer dat moet.</p>
        </>
      ),
    },
    {
      id: 'acties', group: 'De onderdelen', title: 'Acties', to: '/acties', toLabel: 'Open acties', keywords: 'taken deadline verantwoordelijke meetpunt status',
      body: (
        <>
          <p>Wat doet de school om het doel te bereiken? Elke actie hoort bij één operationeel doel en heeft een <Ref id="actiestatus">status</Ref>, verantwoordelijke en deadline.</p>
          <p>Op deze pagina staan alle acties van het schooljaar. Je wijzigt de status meteen in de lijst en filtert op status of doel; standaard zie je wat nog niet uitgevoerd is. Klik op een tegel bovenaan om op die status te filteren.</p>
          <p>Wil je ook het succes van een actie meten, vink dan <strong>Het succes van deze actie meten met een meetpunt</strong> aan. Dat meetpunt heeft dezelfde velden als een indicator, maar telt niet mee in de <Ref id="inschatting">inschatting</Ref> van het doel.</p>
        </>
      ),
    },
    {
      id: 'kalender', group: 'De onderdelen', title: 'Kalender', to: '/kalender', toLabel: 'Open de kalender', keywords: 'maand meting invullen planning',
      body: <p>Per maand van het schooljaar de indicatoren en meetpunten van acties die gemeten moeten worden, met hun <Ref id="invulstatus">invulstatus</Ref>. Klik erop om de meting in te vullen. Met <strong>Enkel indicatoren</strong> verberg je de meetpunten van acties.</p>,
    },
    {
      id: 'documenten', group: 'De onderdelen', title: 'Documenten', to: '/documenten', toLabel: 'Open documenten', keywords: 'bestand uploaden rapport bijlage downloaden pdf word excel',
      body: (
        <>
          <p>Rapporten en andere bijlagen van de school, per schooljaar. Kies een bestand, het schooljaar en het type en klik op <strong>Uploaden</strong>. Klik op een bestandsnaam om het te downloaden.</p>
          <p>Toegestaan zijn PDF, Word, Excel, PowerPoint, CSV, PNG, JPG en WEBP, tot 25 MB per bestand.</p>
          {isStaff ? <p>Schoolgebruikers kunnen alleen documenten verwijderen die ze zelf hebben toegevoegd; jij kan alle documenten van je scholen verwijderen.</p> : <p>Je kan alleen documenten verwijderen die je zelf hebt toegevoegd.</p>}
        </>
      ),
    },

    // ------------------------------------------------------------ Begrippen
    {
      id: 'inschatting', group: 'Begrippen', title: 'Inschatting van een doel', keywords: 'op koers aandacht niet op koers voorlopig berekening percentage rekenmachine',
      body: (
        <>
          <p>De inschatting van een operationeel doel volgt uit de resultaten van zijn indicatoren. Van de indicatoren met een resultaat telt het aandeel dat op niveau is:</p>
          <div className="flow-rule-grid help-rule">
            <span className="status-pill ok">Op koers</span><span>minstens {pct(GOAL_RULE.opKoers)} op niveau</span>
            <span className="status-pill monitoren">Aandacht</span><span>{pct(GOAL_RULE.aandacht)} tot {pct(GOAL_RULE.opKoers)} op niveau</span>
            <span className="status-pill actie">Niet op koers</span><span>minder dan {pct(GOAL_RULE.aandacht)} op niveau</span>
          </div>
          <p>De inschatting is <strong>voorlopig</strong> zolang niet alle indicatoren een resultaat hebben. Acties en hun meetpunten tellen niet mee.</p>
          <GoalCalculator />
        </>
      ),
    },
    {
      id: 'resultaat', group: 'Begrippen', title: 'Resultaat: op of onder niveau', keywords: 'drempelwaarde minstens hoogstens beoordeling groen rood zonder beoordeling',
      body: (
        <>
          <p>Bij een meting duid je het resultaat aan: <strong>op niveau</strong> of <strong>onder niveau</strong>. Klik nog eens op je keuze om ze weg te halen; de meting staat dan als <strong>zonder beoordeling</strong>.</p>
          <p>Met een drempelwaarde (bijvoorbeeld "hoogstens 25" of "minstens 80") stelt de tool het resultaat voor zodra je de waarde invult. Je kan daarvan afwijken. Bij vrije tekst is de drempelwaarde alleen ter info, en kies je het resultaat zelf.</p>
          <p>Het resultaat zegt hoe goed de meting is, de <Ref id="invulstatus">invulstatus</Ref> of ze al gebeurd is.</p>
        </>
      ),
    },
    {
      id: 'invulstatus', group: 'Begrippen', title: 'Invulstatus', keywords: 'te laat ingevuld deze maand gepland',
      body: (
        <>
          <p>Is een meting al ingevuld? Dat hangt af van de gekozen maand:</p>
          <ul>
            <li><strong>Ingevuld:</strong> er staat een waarde of een resultaat.</li>
            <li><strong>Deze maand:</strong> de maand van de meting is nu.</li>
            <li><strong>Te laat:</strong> de maand is voorbij en er is nog niets ingevuld.</li>
            <li><strong>Gepland:</strong> de maand moet nog komen.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'actiestatus', group: 'Begrippen', title: 'Status van een actie', keywords: 'in te plannen gepland in uitvoering uitgevoerd te laat',
      body: (
        <>
          <div className="flow-statuses">
            {TEST_ACTION_STATUSES.map((s) => <span key={s.key} className={`status-pill task-${s.key}`}>{s.label}</span>)}
          </div>
          <p>Je kiest de status zelf. Een actie is <strong>te laat</strong> als de deadline voorbij is en ze nog niet uitgevoerd is.</p>
        </>
      ),
    },
    {
      id: 'codes', group: 'Begrippen', title: 'Codes: ROK-, Sign- en Strat-', keywords: 'nummering nummer ROK-R1 Sign-P1 Strat-1',
      body: (
        <>
          <ul>
            <li><strong>ROK-R1 … ROK-BL12:</strong> de kwaliteitsverwachtingen van het ROK, voor iedereen dezelfde.</li>
            <li><strong>Sign-C1, Sign-P1, Sign-R1:</strong> signalen. De letter is de categorie van het domein (context, proces of resultaten), het nummer telt per school en categorie.</li>
            <li><strong>Strat-1, Strat-2:</strong> strategische doelen, genummerd per school.</li>
          </ul>
          <p>Sign- en Strat-codes gelden binnen één school: Sign-P1 van de ene school heeft niets te maken met Sign-P1 van een andere.</p>
        </>
      ),
    },
    {
      id: 'domeinen', group: 'Begrippen', title: 'Domeinen en categorieën', keywords: 'context proces resultaten thema nieuw domein',
      body: (
        <>
          <p>Elk signaal is gebaseerd op één domein uit een vaste lijst voor alle scholen. Elk domein hoort bij een categorie:</p>
          <p className="flow-cats"><CategoryTag category="context" /> <CategoryTag category="proces" /> <CategoryTag category="resultaten" /></p>
          <p>Een operationeel doel krijgt zijn domeinen via de gekoppelde signalen. Op het dashboard tellen de indicatoren van dat doel mee bij elk van die domeinen.</p>
          {isStaff
            ? <p>Staat het domein er niet bij? Kies bovenaan de lijst in het signaal <strong>+ Nieuw domein…</strong>. {isAdmin ? <>Bewerken en verwijderen doe je onder <Ref id="domeinbeheer">Sjablonen → Domeinen</Ref>.</> : 'Alleen admins kunnen domeinen bewerken of verwijderen.'}</p>
            : <p>Staat het domein dat je nodig hebt er niet bij? Vraag het aan je consultant.</p>}
        </>
      ),
    },

    // ------------------------------------------------------------ Veelgestelde vragen
    {
      id: 'geen-doelen', group: 'Veelgestelde vragen', title: 'Waarom zie ik mijn doelen niet?', keywords: 'leeg verdwenen kwijt weg',
      body: <p>Kijk eerst naar het <Ref id="kiezen">schooljaar rechtsboven</Ref>, en bij meerdere scholen ook naar de school linksboven. Operationele doelen, indicatoren en acties horen bij één schooljaar en starten in 2026-2027.</p>,
    },
    {
      id: 'verwijderen', group: 'Veelgestelde vragen', title: 'Wat gebeurt er als ik iets verwijder?', keywords: 'wissen ongedaan maken terugzetten',
      body: (
        <>
          <p>De tool vraagt altijd eerst een bevestiging, maar verwijderen kan niet ongedaan worden gemaakt.</p>
          <ul>
            <li><strong>Operationeel doel:</strong> ook de indicatoren en acties ervan worden verwijderd.</li>
            <li><strong>Actie:</strong> ook het meetpunt ervan wordt verwijderd.</li>
            <li><strong>Indicator:</strong> ook de meting ervan wordt verwijderd.</li>
            <li><strong>Signaal of strategisch doel:</strong> de koppeling verdwijnt, de operationele doelen blijven bestaan.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'uploaden', group: 'Veelgestelde vragen', title: 'Waarom lukt het uploaden niet?', keywords: 'bestand te groot bestandstype niet toegestaan fout',
      body: <p>Meestal is het bestand groter dan 25 MB of is het type niet toegestaan. Zie <Ref id="documenten">Documenten</Ref> voor de toegestane types.</p>,
    },
    {
      id: 'wachtwoord', group: 'Veelgestelde vragen', title: 'Ik ben mijn wachtwoord vergeten', keywords: 'aanmelden lukt niet inloggen geblokkeerd te veel aanmeldpogingen',
      body: isStaff
        ? <p>{isAdmin ? 'Een andere admin' : 'Een admin'} kan onder <strong>Gebruikers</strong> een nieuw wachtwoord instellen, of mail naar <a href={`mailto:${contact}`}>{contact}</a>. Schoolgebruikers help je zelf onder <Ref id="gebruikers">Gebruikers</Ref>. Na te veel aanmeldpogingen moet je 15 minuten wachten.</p>
        : <p>Vraag een nieuw wachtwoord aan je consultant of mail naar <a href={`mailto:${contact}`}>{contact}</a>. Na te veel aanmeldpogingen moet je 15 minuten wachten.</p>,
    },
    {
      id: 'privacy', group: 'Veelgestelde vragen', title: 'Wie ziet mijn gegevens?', keywords: 'privacy andere scholen toegang logboek bezoek bijgehouden',
      body: (
        <>
          <p>Andere scholen zien de gegevens van een school niet. De gegevens zijn alleen toegankelijk voor wie aan de school gekoppeld is, en voor de beheerders van de tool.</p>
          <p>Van schoolgebruikers wordt bijgehouden wanneer ze op de site geweest zijn. Consultants van hun school en admins kunnen dat zien. Die bezoeken worden na een jaar automatisch verwijderd.</p>
        </>
      ),
    },

    // ------------------------------------------------------------ Beheer
    {
      id: 'scholen', group: 'Beheer', title: 'Scholen', roles: ['admin', 'consultant'], to: '/scholen', toLabel: 'Open scholen', keywords: 'contactpersoon instellingsnummer inactief',
      body: (
        <>
          <p>De scholen die je opvolgt, met hun contactgegevens en notities. Met <strong>Openen</strong> ga je naar het dashboard van die school.</p>
          {isAdmin
            ? <p>Als admin maak je scholen aan, bewerk je ze en verwijder je ze. Met het vinkje <strong>Voorbeeldschool</strong> maak je er een <Ref id="voorbeeldschool">voorbeeldschool</Ref> van.</p>
            : <p>Je bewerkt de gegevens van de scholen die aan jou zijn toegewezen. Een admin maakt scholen aan en verwijdert ze.</p>}
        </>
      ),
    },
    {
      id: 'gebruikers', group: 'Beheer', title: 'Gebruikers', roles: ['admin', 'consultant'], to: '/gebruikers', toLabel: 'Open gebruikers', keywords: 'account uitnodigen rol deactiveren wachtwoord teaser',
      body: (
        <>
          <p>Maak voor elke persoon een account met een tijdelijk wachtwoord, kies de scholen en de <Ref id="huisstijl">stijl</Ref>. Er is geen automatische uitnodiging: bezorg de gegevens zelf.</p>
          <p>Wil je iemand de toegang ontnemen maar de geschiedenis bewaren, zet het account dan op gedeactiveerd in plaats van het te verwijderen.</p>
          {isAdmin
            ? <p>Als admin maak je alle rollen aan: admin, consultant en school. Een consultant kan alleen schoolaccounts aanmaken, en een schoolaccount alleen beheren als al diens scholen aan die consultant zijn toegewezen.</p>
            : <p>Je maakt schoolaccounts aan voor je eigen scholen. Je kan een account alleen bewerken als al diens scholen aan jou zijn toegewezen. De scholen van een bestaand account wijzigen of een account verwijderen doet een admin.</p>}
        </>
      ),
    },
    {
      id: 'logboek', group: 'Beheer', title: 'Logboek', roles: ['admin', 'consultant'], to: '/logboek', toLabel: 'Open het logboek', keywords: 'bezoeken wanneer aangemeld activiteit',
      body: <p>Wanneer schoolgebruikers op de site geweest zijn{isAdmin ? '' : ', voor je eigen scholen'}. Een bezoek loopt van hun eerste tot hun laatste activiteit en eindigt na 30 minuten stilte; "Tot" is dus bij benadering. Filter op school of zoek op gebruiker. Bezoeken worden na een jaar verwijderd, en ook als de gebruiker verwijderd wordt.</p>,
    },
    {
      id: 'domeinbeheer', group: 'Beheer', title: 'Domeinen beheren', roles: ['admin'], to: '/sjablonen/domeinen', toLabel: 'Open domeinen', keywords: 'sjablonen categorie',
      body: <p>De gedeelde lijst van <Ref id="domeinen">domeinen</Ref> voor alle scholen, met hun categorie. Alleen admins bewerken of verwijderen ze; consultants en admins kunnen een nieuw domein toevoegen vanuit een signaal.</p>,
    },
    {
      id: 'huisstijl', group: 'Beheer', title: 'Huisstijl', roles: ['admin', 'consultant'], keywords: 'stijl bespreek catalista logo kleuren thema',
      body: (
        <>
          <p>De tool bestaat in de stijl van bespreek en van Catalista. De stijl hoort bij de gebruiker: wie een account aanmaakt of bewerkt, kiest ze in het formulier onder <Ref id="gebruikers">Gebruikers</Ref>. Ook het contactadres op deze pagina volgt de stijl.</p>
          {isAdmin && <p>Je eigen stijl kies je onder <Ref id="profiel">Mijn profiel</Ref>.</p>}
        </>
      ),
    },
  ].filter((a) => (a.roles ? a.roles.includes(role) : true) && a.show !== false);
}
