require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const School = require('../models/School');
const TestResult = require('../models/test/TestResult');
const TestGoal = require('../models/test/TestGoal');
const TestMeetpunt = require('../models/test/TestMeetpunt');
const TestAction = require('../models/test/TestAction');
const TestSignal = require('../models/test/TestSignal');
const TestStrategicGoal = require('../models/test/TestStrategicGoal');

// Fills a separate dummy school with example data, so the pages can be tried out without touching real schools:
//   node utils/seedTestDummy.js          (re)creates the examples below; other goals and strategic goals stay
//   node utils/seedTestDummy.js --remove deletes the school and all its data
const SCHOOL = 'Testschool (dummy)';
const YEAR = '2026-2027';

const STRATEGIC = [
  ['Resultaten verbeteren', 'Alle leerlingen halen de doelen en stromen goed door.'],
  ['Welbevinden en aanwezigheid versterken', 'Leerlingen zijn graag en elke dag op school.'],
];

// [domein, title, description, measure, valueType, start value, year of the start value]
const SIGNALS = [
  ['Oki taal leerlingen', 'Meer leerlingen met een andere thuistaal', 'Het aandeel leerlingen met een andere thuistaal stijgt.', '% leerlingen met een andere thuistaal', 'percentage', 27, '2025-2026'],
  ['Afwezigheden - Ongewettigd', 'Ongewettigde afwezigheid neemt toe', 'Vooral over de middag en in de tweede graad.', 'Aantal leerlingen met ongewettigde afwezigheid', 'absoluut', 34, '2025-2026'],
  ['Ouderparticipatie', 'Opkomst op oudercontacten daalt', 'De opkomst daalt al twee jaar.', '% ouders aanwezig op het oudercontact', 'percentage', 83, '2025-2026'],
  ['AVI', 'Technisch lezen blijft achter', 'Minder leerlingen halen het verwachte AVI-niveau.', '% leerlingen op AVI-niveau', 'percentage', 79, '2025-2026'],
];

const IND = (title, month, valueType, threshold, thresholdDirection, bron, value, beoordeling) => ({ title, month, valueType, threshold, thresholdDirection, bron, value: value ?? null, beoordeling: beoordeling || null });

// title, description, ROK codes, signal titles, strategic goal titles, indicators, actions [title, status, owner, due, meetpunt?]
const GOALS = [
  {
    title: 'Ongewettigde afwezigheid terugdringen', description: 'Minder leerlingen zijn ongewettigd afwezig, vooral over de middag.',
    rok: ['R5', 'B3'], signals: ['Ongewettigde afwezigheid neemt toe'], strategic: ['Welbevinden en aanwezigheid versterken'],
    indicators: [
      IND('Aantal leerlingen met ongewettigde afwezigheid', 'oktober', 'absoluut', 30, 'max', 'Smartschool', 31, 'rood'),
      IND('Aantal leerlingen met ongewettigde afwezigheid (eind van het jaar)', 'juni', 'absoluut', 25, 'max', 'Smartschool'),
    ],
    actions: [
      ['Gratis maaltijden aanbieden over de middag', 'in_uitvoering', 'directie', '2026-12-20', IND('Aantal leerlingen dat over de middag op school eet', 'december', 'absoluut', 60, 'min', 'kassasysteem')],
      ['Ouders meteen verwittigen bij afwezigheid', 'gepland', 'secretariaat', '2027-01-15'],
      ['Gesprek met leerlingen die vaak afwezig zijn', 'in_te_plannen', 'leerlingbegeleiding', null],
    ],
  },
  {
    title: 'Begrijpend lezen verhogen in alle leerjaren', description: 'Meer leerlingen halen het verwachte leesniveau, met aandacht voor leesmotivatie.',
    rok: ['R1', 'R3', 'O2'], signals: ['Technisch lezen blijft achter'], strategic: ['Resultaten verbeteren'],
    indicators: [
      IND('% leerlingen met A- of B-score lezen', 'oktober', 'percentage', 70, 'min', 'DIA', 73, 'groen'),
      IND('% leerlingen op of boven AVI-niveau', 'januari', 'percentage', 80, 'min', 'LVS'),
      IND('% leerlingen boven het Vlaamse gemiddelde', 'juni', 'percentage', 60, 'min', 'Vlaamse toetsen'),
    ],
    actions: [
      ['Leesbevorderingsplan opstellen met de leesgroep', 'in_uitvoering', 'leescoördinator', '2026-09-30'],
      ['Extra tutorlezen in het 2de leerjaar', 'gepland', 'zorgteam', '2026-11-30', IND('% leerlingen dat één AVI-niveau stijgt', 'maart', 'percentage', 75, 'min', 'LVS')],
      ['Leesmethode evalueren met het team', 'uitgevoerd', 'leescoördinator', '2026-09-15', IND('% leerkrachten tevreden over de methode', 'september', 'percentage', 70, 'min', 'bevraging', 64, 'rood')],
    ],
  },
  {
    title: 'Ouders sterker betrekken bij het leren', description: 'Duidelijke communicatie en een hoge opkomst op oudercontacten.',
    rok: ['R2', 'BL6', 'B4'], signals: ['Opkomst op oudercontacten daalt', 'Meer leerlingen met een andere thuistaal'], strategic: ['Welbevinden en aanwezigheid versterken'],
    indicators: [
      // Two of the three results on level: 67%, an example of the assessment "aandacht"
      IND('% ouders aanwezig op de infoavond', 'september', 'percentage', 60, 'min', 'aanwezigheidslijsten', 72, 'groen'),
      IND('% ouders dat de nieuwsbrief leest', 'oktober', 'percentage', 60, 'min', 'Smartschool', 52, 'rood'),
      IND('Tevredenheid ouders over de communicatie', 'november', 'percentage', 75, 'min', 'ouderbevraging', 78, 'groen'),
      IND('% ouders aanwezig op het oudercontact', 'december', 'percentage', 85, 'min', 'aanwezigheidslijsten'),
    ],
    actions: [
      ['Oudercontacten ook digitaal aanbieden', 'uitgevoerd', 'directie', '2026-09-15'],
      ['Nieuwsbrief herwerken op basis van de bevraging', 'in_te_plannen', 'directie', '2026-10-15'],
    ],
  },
  {
    title: 'Brede basiszorg versterken', description: 'Vroeg detecteren en remediëren, zodat minder leerlingen leersteun nodig hebben.',
    rok: ['B1', 'B3', 'R5'], signals: [], strategic: ['Resultaten verbeteren'],
    indicators: [
      IND('Aantal leerlingen met een remediëringstraject', 'september', 'absoluut', 25, 'max', 'zorgdossiers'),
      IND('Inschaling brede basiszorg door het zorgteam', 'maart', 'tekst', null, 'min', 'zorgteam'),
    ],
    actions: [['Instroom in remediëring analyseren per leerjaar', 'in_uitvoering', 'zorgteam', '2026-10-10']],
  },
  {
    title: 'Professionalisering koppelen aan het schoolwerkplan', description: 'Nascholing en klasbezoeken ondersteunen de prioriteiten van het schoolwerkplan.',
    rok: ['BL9', 'K1'], signals: [], strategic: [],
    indicators: [IND('% nascholingen gekoppeld aan het schoolwerkplan', 'mei', 'percentage', 70, 'min', 'nascholingsoverzicht')],
    actions: [['Nascholingsplan afstemmen op het schoolwerkplan', 'gepland', 'directie', '2027-01-31']],
  },
];

async function run() {
  const school = await School.findOne({ name: SCHOOL });
  if (process.argv.includes('--remove')) {
    if (school) {
      await Promise.all([TestGoal, TestMeetpunt, TestAction, TestSignal, TestStrategicGoal].map((M) => M.deleteMany({ school: school._id })));
      await school.deleteOne();
    }
    console.log(school ? `${SCHOOL} en al zijn gegevens verwijderd.` : `${SCHOOL} bestond niet.`);
    return;
  }
  // Check the domeinen first: without them the script would delete the data and then stop halfway
  const domains = await TestResult.find().lean();
  const domainOf = (name) => domains.find((r) => r.name.toLowerCase() === name.toLowerCase());
  const missing = SIGNALS.map((x) => x[0]).filter((n) => !domainOf(n));
  if (missing.length) throw new Error(`Niets gewijzigd. Deze domeinen bestaan niet (meer): ${missing.join(', ')}. Pas SIGNALS in dit script aan.`);

  const sch = school || (await School.create({ name: SCHOOL, city: 'Voorbeeldgem', notes: 'Dummy school met voorbeeldgegevens.', readOnly: true }));
  const id = sch._id;
  const titles = GOALS.map((g) => g.title);
  const scripted = await TestGoal.find({ school: id, title: { $in: titles } }).select('_id');
  await Promise.all([
    TestMeetpunt.deleteMany({ school: id, goal: { $in: scripted.map((g) => g._id) } }),
    TestAction.deleteMany({ school: id, goal: { $in: scripted.map((g) => g._id) } }),
    TestGoal.deleteMany({ school: id, title: { $in: titles } }),
    TestSignal.deleteMany({ school: id, title: { $in: SIGNALS.map((x) => x[1]) } }),
  ]);

  const strategicId = {};
  for (const [title, description] of STRATEGIC) {
    let s = await TestStrategicGoal.findOne({ school: id, title });
    if (!s) {
      const last = await TestStrategicGoal.findOne({ school: id }).sort({ number: -1 });
      s = await TestStrategicGoal.create({ school: id, title, description, number: last ? last.number + 1 : 1 });
    }
    strategicId[title] = s._id;
  }

  const signalId = {};
  for (const [domain, title, description, measure, valueType, startValue, startYear] of SIGNALS) {
    const d = domainOf(domain);
    const last = await TestSignal.findOne({ school: id, category: d.category }).sort({ number: -1 });
    const s = await TestSignal.create({ school: id, domain: d._id, category: d.category, number: last ? last.number + 1 : 1, title, description, measure, valueType, startValue, startYear });
    signalId[title] = s._id;
  }

  let indicators = 0, actions = 0, meetpunten = 0;
  for (const [i, g] of GOALS.entries()) {
    const goal = await TestGoal.create({
      school: id, schoolYear: YEAR, title: g.title, description: g.description, rok: g.rok, order: i + 1,
      signals: g.signals.map((t) => signalId[t]), strategic: g.strategic.map((t) => strategicId[t]),
    });
    for (const ind of g.indicators) {
      await TestMeetpunt.create({ ...ind, school: id, goal: goal._id, kind: 'indicator' });
      indicators++;
    }
    for (const [title, status, owner, due, mp] of g.actions) {
      const action = await TestAction.create({ school: id, goal: goal._id, title, status, owner, dueDate: due ? new Date(due) : null, completedAt: status === 'uitgevoerd' ? new Date(due) : null });
      actions++;
      if (mp) {
        await TestMeetpunt.create({ ...mp, school: id, goal: goal._id, action: action._id, kind: 'actie' });
        meetpunten++;
      }
    }
  }
  console.log(`${SCHOOL}: ${GOALS.length} doelen, ${SIGNALS.length} signalen, ${indicators} indicatoren, ${actions} acties, ${meetpunten} actiemeetpunten.`);
}

if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB()
    .then(run)
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((err) => { console.error(err.message); process.exit(1); });
}
