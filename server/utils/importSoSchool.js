require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const mongoose = require('mongoose');
const School = require('../models/School');
const Indicator = require('../models/Indicator');
const IndicatorScore = require('../models/IndicatorScore');

// Imports one SO school's ratings from a file made by tools/extract_so_seed.py:
//   node utils/importSoSchool.js ../tools/data/sint-norbertus.json [--overwrite]
// Creates the school (type SO) when no school with that name exists. Existing ratings are kept
// unless --overwrite is passed. Months equal to the indicator's default month are not stored.
async function importSchool(file, { overwrite = false } = {}) {
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const nameRe = new RegExp(`^${data.school.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  let school = await School.findOne({ name: nameRe });
  if (school && school.type !== 'SO') throw new Error(`"${school.name}" bestaat al als ${school.type}-school.`);
  if (!school) {
    school = await School.create({ name: data.school, type: 'SO' });
    console.log(`School aangemaakt: ${school.name} (SO)`);
  }

  const indicators = new Map((await Indicator.find().lean()).map((i) => [i.key, i]));
  let written = 0, kept = 0;
  for (const s of data.scores) {
    const ind = indicators.get(s.indicatorKey);
    if (!ind) throw new Error(`Onbekende indicator ${s.indicatorKey}: seed eerst de SO-sjablonen.`);
    const fields = {
      inschaling: s.inschaling,
      month: s.month && s.month !== ind.month ? s.month : '',
      action: s.action || '',
    };
    if (fields.inschaling === null && !fields.month && !fields.action) continue;
    const key = { school: school._id, schoolYear: data.schoolYear, indicatorKey: s.indicatorKey };
    if (!overwrite && (await IndicatorScore.exists(key))) { kept++; continue; }
    await IndicatorScore.findOneAndUpdate(key, { $set: fields, $setOnInsert: key }, { upsert: true });
    written++;
  }
  console.log(`${school.name} ${data.schoolYear}: ${written} inschalingen geschreven, ${kept} bestaande behouden.`);
}

module.exports = { importSchool };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Gebruik: node utils/importSoSchool.js <bestand.json> [--overwrite]'); process.exit(1); }
  const connectDB = require('../config/db');
  connectDB()
    .then(() => importSchool(file, { overwrite: process.argv.includes('--overwrite') }))
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((err) => { console.error(err.message); process.exit(1); });
}
