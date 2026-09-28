require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const ReferenceItem = require('../models/ReferenceItem');
const Question = require('../models/Question');
const PlanItem = require('../models/PlanItem');

const readSeed = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'seed', name), 'utf-8'));

// Idempotent: only fills collections that are still empty, so admin edits are never overwritten
// (unless --reset-templates is passed, which replaces references, questions and the default plan).
async function runSeed({ reset = false } = {}) {
  const log = [];

  if (reset) {
    await ReferenceItem.deleteMany({});
    await Question.deleteMany({});
    await PlanItem.deleteMany({ school: null });
    log.push('Templates reset');
  }

  if ((await ReferenceItem.countDocuments()) === 0) {
    await ReferenceItem.insertMany(readSeed('references.json'));
    log.push('Reference lists seeded');
  }
  if ((await Question.countDocuments()) === 0) {
    await Question.insertMany(readSeed('questions.json'));
    log.push('Questionnaire seeded');
  }
  if ((await PlanItem.countDocuments({ school: null })) === 0) {
    await PlanItem.insertMany(readSeed('plan-template.json').map((p) => ({ ...p, school: null, schoolYear: null })));
    log.push('Default year plan seeded');
  }

  const email = (process.env.SEED_ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if ((await User.countDocuments({ role: 'admin' })) === 0) {
    if (email && password) {
      await User.create({ name: process.env.SEED_ADMIN_NAME || 'Admin', email, password, role: 'admin' });
      log.push(`Admin account created for ${email}`);
    } else {
      log.push('No admin exists yet: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one');
    }
  }

  if (log.length) console.log('[seed]', log.join(' | '));
  return log;
}

module.exports = { runSeed };

// Run directly: `npm run seed` (or `npm run seed:reset-templates`)
if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB()
    .then(() => runSeed({ reset: process.argv.includes('--reset-templates') }))
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
