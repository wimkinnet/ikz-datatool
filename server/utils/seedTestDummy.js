require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const School = require('../models/School');
const TestResult = require('../models/test/TestResult');
const TestGoal = require('../models/test/TestGoal');
const TestMeetpunt = require('../models/test/TestMeetpunt');
const TestMeting = require('../models/test/TestMeting');
const TestAction = require('../models/test/TestAction');

// Fills a separate dummy school with example data for the Test tab, so the pages can be tried out
// without touching real schools:  node utils/seedTestDummy.js        (re)creates the data
//                                 node utils/seedTestDummy.js --remove deletes the school and its data
const SCHOOL = 'Testschool (dummy)';

// [beoogd resultaat (or a list of them), meetpunt, type, threshold, direction, month, bron, values per year (2024-25, 2025-26, 2026-27)]
// A value of undefined means: not measured that year. Text points carry [value, verdict].
const MEETPUNTEN = [
  ['Vlaamse toetsen', '% leerlingen boven het Vlaamse gemiddelde begrijpend lezen (6de lj)', 'percentage', 60, 'min', 'juni', 'Vlaamse toetsen', [52, 58]],
  ['AVI', '% leerlingen op of boven AVI-niveau (1ste-3de lj)', 'percentage', 80, 'min', 'januari', 'LVS', [74, 79]],
  [['AVI', "Aantal leerlingen met remediëringstraject + welke zorgthema's spelen"], 'Aantal leerlingen meer dan 1 AVI-niveau achter', 'absoluut', 8, 'max', 'juni', 'LVS', [11, 9]],
  ['DIAtoetsen', '% leerlingen met A- of B-score lezen', 'percentage', 70, 'min', 'oktober', 'DIA', [66, 71, 73]],
  ['Ouderbevraging over communicatie', 'Tevredenheid ouders over de communicatie', 'percentage', 75, 'min', 'november', 'eigen ouderbevraging', [81, 72]],
  ['10 minuutgesprekken', '% ouders aanwezig op het oudercontact', 'percentage', 85, 'min', 'december', 'aanwezigheidslijsten', [88, 83]],
  ['Inschaling Brede basiszorg', 'Inschaling brede basiszorg door het zorgteam', 'tekst', null, 'min', 'maart', 'zorgteam',
    [['fase 0 en 1 goed uitgebouwd, fase 2 nog onvoldoende', 'rood'], ['alle fases minstens voldoende', 'groen']], 'minstens voldoende op alle fases'],
  ["Aantal leerlingen met remediëringstraject + welke zorgthema's spelen", 'Aantal leerlingen met een remediëringstraject', 'absoluut', 25, 'max', 'september', 'Bingel / zorgdossiers', [31, 27]],
  ['Aanmeldingen leersteun', 'Aantal aanmeldingen bij het leersteuncentrum', 'absoluut', 6, 'max', 'september', 'leersteuncentrum', [5, 7, 4]],
  ['Professionalisering per leerkracht', 'Gemiddeld aantal nascholingsuren per leerkracht', 'absoluut', 12, 'min', 'mei', 'nascholingsoverzicht', [9, 13]],
  ['Professionalisering per leerkracht', '% nascholingen gekoppeld aan het schoolwerkplan', 'percentage', 70, 'min', 'mei', 'nascholingsoverzicht', [55, 68]],
  ['Evaluatie leerkrachten (deel van team)', '% leerkrachten met een functioneringsgesprek', 'percentage', 90, 'min', 'juni', 'functioneringsverslagen', [92, 86]],
  [['Effectieve didactiek - project TM', 'Evaluatie leerkrachten (deel van team)'], '% klasbezoeken met effectieve instructie', 'percentage', 75, 'min', 'oktober', 'observatie-instrument klasbezoek', [undefined, 60]],
  ['Instroom', 'Aantal zij-instromers', 'absoluut', null, 'min', 'september', 'wisa', [14, 18, 16]],
];

const GOALS = [
  ['Begrijpend lezen verhogen in alle leerjaren', 'Meer leerlingen halen het verwachte leesniveau, met aandacht voor leesmotivatie.', ['R1', 'R3', 'O2'],
    ['Vlaamse toetsen', 'AVI', 'DIAtoetsen']],
  ['Ouders sterker betrekken bij het leren', 'Duidelijke communicatie en een hoge opkomst op oudercontacten.', ['R2', 'BL6', 'B4'],
    ['Ouderbevraging over communicatie', '10 minuutgesprekken']],
  ['Brede basiszorg versterken', 'Vroeg detecteren en remediëren, zodat minder leerlingen leersteun nodig hebben.', ['B1', 'B3', 'R5'],
    ['Inschaling Brede basiszorg', "Aantal leerlingen met remediëringstraject + welke zorgthema's spelen", 'Aanmeldingen leersteun']],
  ['Professionalisering koppelen aan het schoolwerkplan', 'Nascholing en klasbezoeken ondersteunen de prioriteiten van het schoolwerkplan.', ['BL9', 'K1'],
    ['Professionalisering per leerkracht', 'Evaluatie leerkrachten (deel van team)', 'Effectieve didactiek - project TM']],
];

// [meetpunt title, school year, action, owner, due date, status]
const ACTIONS = [
  ['% leerlingen boven het Vlaamse gemiddelde begrijpend lezen (6de lj)', '2024-2025', 'Leesmethode evalueren met het lerarenteam', 'leescoördinator', '2025-06-20', 'afgerond'],
  ['% leerlingen boven het Vlaamse gemiddelde begrijpend lezen (6de lj)', '2025-2026', 'Leesbevorderingsplan opstellen met de leesgroep', 'leescoördinator', '2026-09-30', 'bezig'],
  ['% leerlingen op of boven AVI-niveau (1ste-3de lj)', '2025-2026', 'Extra tutorlezen in het 2de leerjaar', 'zorgteam', '2026-11-15', 'open'],
  ['Aantal leerlingen meer dan 1 AVI-niveau achter', '2025-2026', 'Remediëringsgroepen technisch lezen herschikken', 'zorgcoördinator', '2026-10-01', 'open'],
  ['Tevredenheid ouders over de communicatie', '2025-2026', 'Nieuwsbrief herwerken op basis van de bevraging', 'directie', '2026-12-20', 'open'],
  ['% ouders aanwezig op het oudercontact', '2025-2026', 'Oudercontacten ook digitaal aanbieden', 'directie', '2026-09-15', 'afgerond'],
  ['Aantal leerlingen met een remediëringstraject', '2025-2026', 'Instroom in remediëring analyseren per leerjaar', 'zorgteam', '2026-10-10', 'bezig'],
  ['% nascholingen gekoppeld aan het schoolwerkplan', '2025-2026', 'Nascholingsplan afstemmen op het schoolwerkplan', 'directie + pedagogisch begeleider', '2027-01-31', 'open'],
  ['% leerkrachten met een functioneringsgesprek', '2025-2026', 'Planning functioneringsgesprekken vastleggen', 'directie', '2026-11-30', 'open'],
];

const YEARS = ['2024-2025', '2025-2026', '2026-2027'];
const verdict = (value, threshold, dir) => (threshold === null ? null : (dir === 'max' ? value <= threshold : value >= threshold) ? 'groen' : 'rood');

async function remove() {
  const school = await School.findOne({ name: SCHOOL });
  if (!school) return null;
  await Promise.all([TestGoal, TestMeetpunt, TestMeting, TestAction].map((M) => M.deleteMany({ school: school._id })));
  return school;
}

async function run() {
  const existing = await remove();
  if (process.argv.includes('--remove')) {
    if (existing) await existing.deleteOne();
    console.log(existing ? `${SCHOOL} en al zijn Test-gegevens verwijderd.` : `${SCHOOL} bestond niet.`);
    return;
  }
  const school = existing || (await School.create({ name: SCHOOL, type: 'BO', city: 'Voorbeeldgem', notes: 'Dummy school met voorbeeldgegevens voor de Test-tab.' }));

  const results = await TestResult.find().lean();
  const resultId = (name) => {
    const r = results.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!r) throw new Error(`Beoogd resultaat "${name}" niet gevonden - seed eerst de Test-sjablonen.`);
    return r._id;
  };

  const mpByTitle = {};
  let metingen = 0;
  for (const [i, [result, title, valueType, threshold, dir, month, bron, values, thresholdText]] of MEETPUNTEN.entries()) {
    const mp = await TestMeetpunt.create({
      school: school._id, results: [].concat(result).map(resultId), title, valueType, threshold, thresholdDirection: dir,
      thresholdText: thresholdText || '', month, bron, order: i + 1,
      uitleg: valueType === 'tekst' ? 'Jaarlijkse inschaling door het zorgteam met het referentiekader brede basiszorg.' : '',
    });
    mpByTitle[title] = mp;
    for (const [y, v] of values.entries()) {
      if (v === undefined) continue;
      const [value, beoordeling] = valueType === 'tekst' ? v : [v, verdict(v, threshold, dir)];
      await TestMeting.create({ school: school._id, meetpunt: mp._id, schoolYear: YEARS[y], value, beoordeling });
      metingen++;
    }
  }

  for (const [i, [title, description, rok, resultNames]] of GOALS.entries()) {
    await TestGoal.create({ school: school._id, schoolYear: '2026-2027', title, description, rok, results: resultNames.map(resultId), order: i + 1 });
  }

  for (const [mpTitle, schoolYear, title, owner, due, status] of ACTIONS) {
    await TestAction.create({
      school: school._id, meetpunt: mpByTitle[mpTitle]._id, schoolYear, title, owner, dueDate: new Date(due), status,
      completedAt: status === 'afgerond' ? new Date(due) : null,
    });
  }
  console.log(`${SCHOOL}: ${GOALS.length} doelen, ${MEETPUNTEN.length} meetpunten, ${metingen} metingen, ${ACTIONS.length} acties.`);
}

if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB()
    .then(run)
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((err) => { console.error(err.message); process.exit(1); });
}
