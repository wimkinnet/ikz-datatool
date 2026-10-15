require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const RokExpectation = require('../models/RokExpectation');
const TestResult = require('../models/test/TestResult');

const readSeed = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'seed', name), 'utf-8'));

// Idempotent: only fills collections that are still empty, so admin edits are never overwritten
// (unless --reset-templates is passed, which replaces the ROK and the list of domeinen).
async function runSeed({ reset = false } = {}) {
  const log = [];

  if (reset) {
    await RokExpectation.deleteMany({});
    await TestResult.deleteMany({});
    log.push('Templates reset');
  }

  // The ROK (referentiekader voor onderwijskwaliteit) with every quality expectation
  if ((await RokExpectation.countDocuments()) === 0) {
    await RokExpectation.insertMany(readSeed('rok.json'));
    log.push('ROK seeded');
  }
  // The shared list of domeinen that operational goals and meetpunten link to
  if ((await TestResult.countDocuments()) === 0) {
    await TestResult.insertMany(readSeed('test-results.json'));
    log.push('Domeinen seeded');
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
