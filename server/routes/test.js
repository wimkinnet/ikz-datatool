const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const TestResult = require('../models/test/TestResult');
const TestGoal = require('../models/test/TestGoal');
const TestMeetpunt = require('../models/test/TestMeetpunt');
const TestAction = require('../models/test/TestAction');
const TestSignal = require('../models/test/TestSignal');
const TestStrategicGoal = require('../models/test/TestStrategicGoal');
const { protect, requireRole, requireStaff } = require('../middleware/auth');
const { schoolScope, canAccessSchool } = require('../middleware/access');
const { PLAN_MONTHS, SCHOOL_YEAR_RE } = require('../utils/constants');
const pick = require('../utils/pick');

// The quality model: an operationeel doel (per school year, from 2026-2027) has indicatoren and acties; an actie has
// an optional meetpunt (indicatoren and actiemeetpunten are both TestMeetpunt). A doel can contribute to signalen
// (each based on a domein, the shared list stored as TestResult) and strategische doelen; consultants and admins
// maintain those. Everyone works on the schools they have access to (admins: all).
// Consultants and admins can add domeinen to the shared list; only admins edit or delete them.
router.use(protect);
const adminOnly = requireRole('admin');

// For routes with :id - loads the document and checks the user may access its school (req.doc)
const owned = (Model, what) => async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: `${what} niet gevonden.` });
    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: `${what} niet gevonden.` });
    if (!canAccessSchool(req.user, doc.school)) return res.status(403).json({ message: 'Je hebt geen toegang tot deze school.' });
    req.doc = doc;
    next();
  } catch (err) { res.status(500).json({ message: 'Er ging iets mis.', error: err.message }); }
};

const FIRST_GOAL_YEAR = '2026-2027';

const fail = (res, err, fallback) => res.status(400).json({ message: err.message || fallback });
const checkYear = (year, first, what) => {
  if (!SCHOOL_YEAR_RE.test(year || '')) throw new Error('Ongeldig schooljaar.');
  if (year < first) throw new Error(`${what} starten in ${first}.`);
};
const ids = (list) => [...new Set((list || []).map(String))].filter((id) => mongoose.isValidObjectId(id));

// A value as a measure of this type stores it: text, a number, or null when empty
function coerceValue(valueType, raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  if (valueType === 'tekst') return String(raw).slice(0, 5000);
  const n = Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n)) throw new Error('Geef een getal in.');
  if (valueType === 'percentage' && (n < 0 || n > 100)) throw new Error('Een percentage ligt tussen 0 en 100.');
  return n;
}

// Creates a document with the next free number; retries when someone else took that number at the same moment
async function createNumbered(Model, scope, fields) {
  for (let attempt = 0; ; attempt++) {
    const last = await Model.findOne(scope).sort({ number: -1 }).select('number');
    try {
      return await Model.create({ ...scope, ...fields, number: last ? last.number + 1 : 1 });
    } catch (err) {
      if (err.code !== 11000 || attempt >= 4) throw err;
    }
  }
}

// The goal must exist and belong to this school
async function goalOfSchool(id, school) {
  const goal = mongoose.isValidObjectId(id) ? await TestGoal.findOne({ _id: id, school }) : null;
  if (!goal) throw new Error('Kies een operationeel doel.');
  return goal;
}

// ---------------------------------------------------------------- domeinen (shared list; model TestResult)
router.get('/results', async (req, res) => {
  const filter = req.query.all ? {} : { active: true };
  res.json(await TestResult.find(filter).sort({ order: 1, name: 1 }).lean());
});

router.post('/results', requireStaff, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) throw new Error('Geef het domein een naam.');
    const duplicate = await TestResult.findOne({ name }).collation({ locale: 'nl', strength: 2 });
    if (duplicate) {
      return res.status(409).json({ message: `Het domein "${duplicate.name}" bestaat al${duplicate.active ? '' : ' (inactief)'}.` });
    }
    const last = await TestResult.findOne().sort({ order: -1 });
    const body = { ...pick(req.body, ['category', 'description', 'active']), name };
    res.status(201).json(await TestResult.create({ ...body, order: last ? last.order + 1 : 1 }));
  } catch (err) { fail(res, err, 'Kon domein niet aanmaken.'); }
});

router.put('/results/:id', adminOnly, async (req, res) => {
  try {
    const r = await TestResult.findByIdAndUpdate(req.params.id, pick(req.body, ['name', 'category', 'description', 'order', 'active']), { new: true, runValidators: true });
    if (!r) return res.status(404).json({ message: 'Domein niet gevonden.' });
    res.json(r);
  } catch (err) { fail(res, err, 'Kon domein niet bijwerken.'); }
});

// Only domeinen no signal uses can be deleted; otherwise deactivate them
router.delete('/results/:id', adminOnly, async (req, res) => {
  try {
    if (await TestSignal.exists({ domain: req.params.id })) {
      return res.status(409).json({ message: 'Dit domein wordt al gebruikt in signalen. Zet het op "inactief" in plaats van te verwijderen.' });
    }
    await TestResult.findByIdAndDelete(req.params.id);
    res.json({ message: 'Domein verwijderd.' });
  } catch (err) { fail(res, err, 'Kon domein niet verwijderen.'); }
});

// ---------------------------------------------------------------- operationele doelen
router.get('/goals', schoolScope, async (req, res) => {
  try {
    // ?all=1: every school year (signals and strategic goals span the years)
    const filter = { school: req.schoolId };
    if (!req.query.all) {
      checkYear(req.query.year, FIRST_GOAL_YEAR, 'Operationele doelen');
      filter.schoolYear = req.query.year;
    }
    res.json(await TestGoal.find(filter).sort({ schoolYear: 1, order: 1, createdAt: 1 }).lean());
  } catch (err) { fail(res, err, 'Kon doelen niet laden.'); }
});

// Signals and strategic goals are optional, but must belong to the goal's own school
async function goalFields(body, school) {
  const f = pick(body, ['title', 'description', 'rok', 'signals', 'strategic', 'order']);
  if (f.rok !== undefined) f.rok = [...new Set((f.rok || []).map(String))];
  for (const [key, Model, what] of [['signals', TestSignal, 'signaal'], ['strategic', TestStrategicGoal, 'strategisch doel']]) {
    if (f[key] === undefined) continue;
    f[key] = ids(f[key]);
    if ((await Model.countDocuments({ _id: { $in: f[key] }, school })) !== f[key].length) throw new Error(`Onbekend ${what} voor deze school.`);
  }
  return f;
}

router.post('/goals', schoolScope, async (req, res) => {
  try {
    checkYear(req.body.schoolYear, FIRST_GOAL_YEAR, 'Operationele doelen');
    const f = await goalFields(req.body, req.schoolId);
    const last = await TestGoal.findOne({ school: req.schoolId, schoolYear: req.body.schoolYear }).sort({ order: -1 });
    res.status(201).json(await TestGoal.create({ ...f, school: req.schoolId, schoolYear: req.body.schoolYear, order: last ? last.order + 1 : 1 }));
  } catch (err) { fail(res, err, 'Kon doel niet aanmaken.'); }
});

router.put('/goals/:id', owned(TestGoal, 'Doel'), async (req, res) => {
  try {
    const f = await goalFields(req.body, req.doc.school);
    res.json(await TestGoal.findByIdAndUpdate(req.params.id, f, { new: true, runValidators: true }));
  } catch (err) { fail(res, err, 'Kon doel niet bijwerken.'); }
});

// A goal's indicators and actions belong to it and go with it (the client asks for confirmation first)
router.delete('/goals/:id', owned(TestGoal, 'Doel'), async (req, res) => {
  try {
    const goal = req.params.id;
    await Promise.all([TestMeetpunt.deleteMany({ goal }), TestAction.deleteMany({ goal })]);
    await req.doc.deleteOne();
    res.json({ message: 'Doel verwijderd.' });
  } catch (err) { fail(res, err, 'Kon doel niet verwijderen.'); }
});

// ---------------------------------------------------------------- signalen (per school, over the years)
// Checks the domein and measure and returns the fields to store
async function signalFields(body) {
  const domain = await TestResult.findById(mongoose.isValidObjectId(body.domain) ? body.domain : null);
  if (!domain) throw new Error('Kies een domein.');
  const valueType = TestMeetpunt.VALUE_TYPES.includes(body.valueType) ? body.valueType : 'absoluut';
  const startYear = body.startYear || '';
  if (startYear && !SCHOOL_YEAR_RE.test(startYear)) throw new Error('Ongeldig schooljaar.');
  const startValue = coerceValue(valueType, body.startValue);
  return { domain: domain._id, category: domain.category, title: body.title, description: body.description || '', measure: body.measure, valueType, startValue, startYear: startValue === null ? '' : startYear };
}

router.get('/signals', schoolScope, async (req, res) => {
  res.json(await TestSignal.find({ school: req.schoolId }).sort({ category: 1, number: 1 }).lean());
});

router.post('/signals', requireStaff, schoolScope, async (req, res) => {
  try {
    const { category, ...fields } = await signalFields(req.body);
    res.status(201).json(await createNumbered(TestSignal, { school: req.schoolId, category }, fields));
  } catch (err) { fail(res, err, 'Kon signaal niet aanmaken.'); }
});

router.put('/signals/:id', requireStaff, owned(TestSignal, 'Signaal'), async (req, res) => {
  try {
    const { category, ...fields } = await signalFields(req.body);
    // A signal that moves to a domein of another category gets a new code in that category
    if (category !== req.doc.category) {
      const last = await TestSignal.findOne({ school: req.doc.school, category }).sort({ number: -1 }).select('number');
      Object.assign(fields, { category, number: last ? last.number + 1 : 1 });
    }
    res.json(await TestSignal.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true }));
  } catch (err) { fail(res, err, 'Kon signaal niet bijwerken.'); }
});

router.delete('/signals/:id', requireStaff, owned(TestSignal, 'Signaal'), async (req, res) => {
  try {
    await TestGoal.updateMany({ signals: req.params.id }, { $pull: { signals: req.params.id } });
    await req.doc.deleteOne();
    res.json({ message: 'Signaal verwijderd.' });
  } catch (err) { fail(res, err, 'Kon signaal niet verwijderen.'); }
});

// ---------------------------------------------------------------- strategische doelen (per school, over the years)
router.get('/strategic', schoolScope, async (req, res) => {
  res.json(await TestStrategicGoal.find({ school: req.schoolId }).sort({ number: 1 }).lean());
});

router.post('/strategic', requireStaff, schoolScope, async (req, res) => {
  try {
    res.status(201).json(await createNumbered(TestStrategicGoal, { school: req.schoolId }, pick(req.body, ['title', 'description'])));
  } catch (err) { fail(res, err, 'Kon strategisch doel niet aanmaken.'); }
});

router.put('/strategic/:id', requireStaff, owned(TestStrategicGoal, 'Strategisch doel'), async (req, res) => {
  try {
    res.json(await TestStrategicGoal.findByIdAndUpdate(req.params.id, pick(req.body, ['title', 'description']), { new: true, runValidators: true }));
  } catch (err) { fail(res, err, 'Kon strategisch doel niet bijwerken.'); }
});

router.delete('/strategic/:id', requireStaff, owned(TestStrategicGoal, 'Strategisch doel'), async (req, res) => {
  try {
    await TestGoal.updateMany({ strategic: req.params.id }, { $pull: { strategic: req.params.id } });
    await req.doc.deleteOne();
    res.json({ message: 'Strategisch doel verwijderd.' });
  } catch (err) { fail(res, err, 'Kon strategisch doel niet verwijderen.'); }
});

// ---------------------------------------------------------------- meetpunten: indicatoren and actiemeetpunten
const MEETPUNT_FIELDS = ['title', 'uitleg', 'bron', 'month', 'valueType', 'threshold', 'thresholdDirection', 'thresholdText', 'value', 'beoordeling', 'comment'];

// Validates the definition and measurement. `current` is the stored meetpunt when updating.
function meetpuntFields(body, current) {
  const f = pick(body, MEETPUNT_FIELDS);
  const month = 'month' in f ? f.month : current && current.month;
  if (!PLAN_MONTHS.includes(month)) throw new Error('Kies de maand van de meting.');
  const valueType = f.valueType || (current && current.valueType) || 'absoluut';
  if (valueType === 'tekst') f.threshold = null;
  else if ('threshold' in f) {
    if (f.threshold === '' || f.threshold === null) f.threshold = null;
    else {
      f.threshold = Number(String(f.threshold).replace(',', '.'));
      if (!Number.isFinite(f.threshold)) throw new Error('De drempelwaarde moet een getal zijn.');
    }
  }
  if ('value' in f) f.value = coerceValue(valueType, f.value);
  if ('beoordeling' in f) {
    if (![null, '', 'groen', 'rood'].includes(f.beoordeling)) throw new Error('Ongeldig resultaat.');
    f.beoordeling = f.beoordeling || null;
  }
  if ('comment' in f) f.comment = String(f.comment || '').slice(0, 5000);
  return f;
}

// Older data has no `kind` or `goal`; only meetpunten and actions of the current model are returned
router.get('/meetpunten', schoolScope, async (req, res) => {
  res.json(await TestMeetpunt.find({ school: req.schoolId, kind: { $in: ['indicator', 'actie'] } }).sort({ month: 1, createdAt: 1 }).lean());
});

// POST /api/test/meetpunten  { school, goal, ... } - an indicator of an operational goal
router.post('/meetpunten', schoolScope, async (req, res) => {
  try {
    const goal = await goalOfSchool(req.body.goal, req.schoolId);
    res.status(201).json(await TestMeetpunt.create({ ...meetpuntFields(req.body), school: req.schoolId, goal: goal._id, kind: 'indicator', updatedBy: req.user._id }));
  } catch (err) { fail(res, err, 'Kon indicator niet aanmaken.'); }
});

router.put('/meetpunten/:id', owned(TestMeetpunt, 'Meetpunt'), async (req, res) => {
  try {
    const f = meetpuntFields(req.body, req.doc);
    res.json(await TestMeetpunt.findByIdAndUpdate(req.params.id, { ...f, updatedBy: req.user._id }, { new: true, runValidators: true }));
  } catch (err) { fail(res, err, 'Kon meetpunt niet bijwerken.'); }
});

router.delete('/meetpunten/:id', owned(TestMeetpunt, 'Meetpunt'), async (req, res) => {
  await req.doc.deleteOne();
  res.json({ message: 'Meetpunt verwijderd.' });
});

// ---------------------------------------------------------------- acties
function actionFields(body) {
  const f = pick(body, ['title', 'description', 'owner', 'dueDate', 'status']);
  if (f.dueDate === '') f.dueDate = null;
  if (f.status !== undefined) {
    if (!TestAction.STATUSES.includes(f.status)) throw new Error('Ongeldige status.');
    f.completedAt = f.status === 'uitgevoerd' ? new Date() : null;
  }
  return f;
}

// The action's optional meetpunt: an object creates or updates it, null removes it, absent leaves it alone
async function saveActionMeetpunt(action, body, userId) {
  if (!('meetpunt' in body)) return;
  const existing = await TestMeetpunt.findOne({ action: action._id, kind: 'actie' });
  if (body.meetpunt === null) {
    if (existing) await existing.deleteOne();
    return;
  }
  const f = meetpuntFields(body.meetpunt, existing);
  if (existing) {
    existing.set({ ...f, updatedBy: userId });
    await existing.save();
  } else {
    await TestMeetpunt.create({ ...f, school: action.school, goal: action.goal, action: action._id, kind: 'actie', updatedBy: userId });
  }
}

router.get('/actions', schoolScope, async (req, res) => {
  res.json(await TestAction.find({ school: req.schoolId, goal: { $exists: true } }).sort({ createdAt: 1 }).lean());
});

router.post('/actions', schoolScope, async (req, res) => {
  let action;
  try {
    const goal = await goalOfSchool(req.body.goal, req.schoolId);
    if (req.body.meetpunt) meetpuntFields(req.body.meetpunt); // refuse a bad meetpunt before creating anything
    action = await TestAction.create({ ...actionFields(req.body), school: req.schoolId, goal: goal._id, createdBy: req.user._id });
    await saveActionMeetpunt(action, req.body, req.user._id);
    res.status(201).json(action);
  } catch (err) {
    if (action) await action.deleteOne();
    fail(res, err, 'Kon actie niet aanmaken.');
  }
});

router.put('/actions/:id', owned(TestAction, 'Actie'), async (req, res) => {
  try {
    const f = actionFields(req.body);
    if ('goal' in req.body) {
      f.goal = (await goalOfSchool(req.body.goal, req.doc.school))._id;
      await TestMeetpunt.updateMany({ action: req.doc._id }, { goal: f.goal });
    }
    req.doc.set(f);
    await req.doc.save();
    await saveActionMeetpunt(req.doc, req.body, req.user._id);
    res.json(req.doc);
  } catch (err) { fail(res, err, 'Kon actie niet bijwerken.'); }
});

router.delete('/actions/:id', owned(TestAction, 'Actie'), async (req, res) => {
  await TestMeetpunt.deleteMany({ action: req.doc._id });
  await req.doc.deleteOne();
  res.json({ message: 'Actie verwijderd.' });
});

module.exports = router;
