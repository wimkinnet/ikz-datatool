const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const TestResult = require('../models/test/TestResult');
const TestGoal = require('../models/test/TestGoal');
const TestMeetpunt = require('../models/test/TestMeetpunt');
const TestMeting = require('../models/test/TestMeting');
const TestAction = require('../models/test/TestAction');
const { protect, requireRole } = require('../middleware/auth');
const { schoolScope, canAccessSchool } = require('../middleware/access');
const { PLAN_MONTHS, SCHOOL_YEAR_RE } = require('../utils/constants');
const pick = require('../utils/pick');

// The quality model: operationele doelen (per school year, from 2026-2027) -> domeinen (shared list, stored as
// TestResult) -> meetpunten (per school) -> metingen per school year (from 2024-2025) -> acties.
// Everyone works on the schools they have access to (admins: all); only admins maintain the list of domeinen.
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
const FIRST_MEASURE_YEAR = '2024-2025';

const fail = (res, err, fallback) => res.status(400).json({ message: err.message || fallback });
const checkYear = (year, first, what) => {
  if (!SCHOOL_YEAR_RE.test(year || '')) throw new Error('Ongeldig schooljaar.');
  if (year < first) throw new Error(`${what} starten in ${first}.`);
};
const ids = (list) => [...new Set((list || []).map(String))].filter((id) => mongoose.isValidObjectId(id));

// ---------------------------------------------------------------- domeinen (shared list; model TestResult)
router.get('/results', async (req, res) => {
  const filter = req.query.all ? {} : { active: true };
  res.json(await TestResult.find(filter).sort({ order: 1, name: 1 }).lean());
});

router.post('/results', adminOnly, async (req, res) => {
  try {
    const last = await TestResult.findOne().sort({ order: -1 });
    const body = pick(req.body, ['name', 'category', 'description', 'active']);
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

// Only results no goal or meetpunt uses can be deleted; otherwise deactivate them
router.delete('/results/:id', adminOnly, async (req, res) => {
  try {
    const id = req.params.id;
    if ((await TestGoal.exists({ results: id })) || (await TestMeetpunt.exists({ results: id }))) {
      return res.status(409).json({ message: 'Dit domein wordt al gebruikt in doelen of meetpunten. Zet het op "inactief" in plaats van te verwijderen.' });
    }
    await TestResult.findByIdAndDelete(id);
    res.json({ message: 'Domein verwijderd.' });
  } catch (err) { fail(res, err, 'Kon domein niet verwijderen.'); }
});

// ---------------------------------------------------------------- operationele doelen
router.get('/goals', schoolScope, async (req, res) => {
  try {
    checkYear(req.query.year, FIRST_GOAL_YEAR, 'Operationele doelen');
    res.json(await TestGoal.find({ school: req.schoolId, schoolYear: req.query.year }).sort({ order: 1, createdAt: 1 }).lean());
  } catch (err) { fail(res, err, 'Kon doelen niet laden.'); }
});

function goalFields(body) {
  const f = pick(body, ['title', 'description', 'rok', 'results', 'order']);
  if (f.rok !== undefined) f.rok = [...new Set((f.rok || []).map(String))];
  if (f.results !== undefined) f.results = ids(f.results);
  return f;
}

router.post('/goals', schoolScope, async (req, res) => {
  try {
    checkYear(req.body.schoolYear, FIRST_GOAL_YEAR, 'Operationele doelen');
    const f = goalFields(req.body);
    if (!f.results || !f.results.length) throw new Error('Koppel minstens één domein.');
    const last = await TestGoal.findOne({ school: req.schoolId, schoolYear: req.body.schoolYear }).sort({ order: -1 });
    res.status(201).json(await TestGoal.create({ ...f, school: req.schoolId, schoolYear: req.body.schoolYear, order: last ? last.order + 1 : 1 }));
  } catch (err) { fail(res, err, 'Kon doel niet aanmaken.'); }
});

router.put('/goals/:id', owned(TestGoal, 'Doel'), async (req, res) => {
  try {
    const f = goalFields(req.body);
    if (f.results && !f.results.length) throw new Error('Koppel minstens één domein.');
    const goal = await TestGoal.findByIdAndUpdate(req.params.id, f, { new: true, runValidators: true });
    if (!goal) return res.status(404).json({ message: 'Doel niet gevonden.' });
    res.json(goal);
  } catch (err) { fail(res, err, 'Kon doel niet bijwerken.'); }
});

router.delete('/goals/:id', owned(TestGoal, 'Doel'), async (req, res) => {
  await TestGoal.findByIdAndDelete(req.params.id);
  res.json({ message: 'Doel verwijderd.' });
});

// ---------------------------------------------------------------- meetpunten (per school)
const MEETPUNT_FIELDS = ['results', 'title', 'uitleg', 'bron', 'month', 'valueType', 'threshold', 'thresholdDirection', 'thresholdText', 'order', 'active'];

async function meetpuntFields(body) {
  const f = pick(body, MEETPUNT_FIELDS);
  if ('results' in f) {
    f.results = ids(f.results);
    if (!f.results.length || (await TestResult.countDocuments({ _id: { $in: f.results } })) !== f.results.length) {
      throw new Error('Kies minstens één domein.');
    }
  }
  if (f.month && !PLAN_MONTHS.includes(f.month)) throw new Error('Ongeldige maand.');
  if ('threshold' in f) {
    if (f.threshold === '' || f.threshold === null) f.threshold = null;
    else {
      f.threshold = Number(String(f.threshold).replace(',', '.'));
      if (!Number.isFinite(f.threshold)) throw new Error('De drempelwaarde moet een getal zijn.');
    }
  }
  return f;
}

router.get('/meetpunten', schoolScope, async (req, res) => {
  res.json(await TestMeetpunt.find({ school: req.schoolId }).sort({ order: 1, createdAt: 1 }).lean());
});

router.post('/meetpunten', schoolScope, async (req, res) => {
  try {
    const f = await meetpuntFields(req.body);
    if (!f.results) throw new Error('Kies minstens één domein.');
    if (f.valueType === 'tekst') f.threshold = null;
    res.status(201).json(await TestMeetpunt.create({ ...f, school: req.schoolId }));
  } catch (err) { fail(res, err, 'Kon meetpunt niet aanmaken.'); }
});

router.put('/meetpunten/:id', owned(TestMeetpunt, 'Meetpunt'), async (req, res) => {
  try {
    const f = await meetpuntFields(req.body);
    if (f.valueType === 'tekst') f.threshold = null;
    const mp = await TestMeetpunt.findByIdAndUpdate(req.params.id, f, { new: true, runValidators: true });
    if (!mp) return res.status(404).json({ message: 'Meetpunt niet gevonden.' });
    res.json(mp);
  } catch (err) { fail(res, err, 'Kon meetpunt niet bijwerken.'); }
});

// Deletes a meetpunt. When it has measurements or actions, ?cascade=1 is required (the client asks for
// confirmation first) and those are deleted with it; without it nothing is removed.
router.delete('/meetpunten/:id', owned(TestMeetpunt, 'Meetpunt'), async (req, res) => {
  try {
    const id = req.params.id;
    if (!(await TestMeetpunt.exists({ _id: id }))) return res.status(404).json({ message: 'Meetpunt niet gevonden.' });
    const [metingen, acties] = await Promise.all([TestMeting.countDocuments({ meetpunt: id }), TestAction.countDocuments({ meetpunt: id })]);
    if ((metingen || acties) && !req.query.cascade) {
      return res.status(409).json({ message: `Dit meetpunt heeft ${metingen} meting(en) en ${acties} actie(s). Bevestig om ze mee te verwijderen.`, metingen, acties });
    }
    await Promise.all([TestMeting.deleteMany({ meetpunt: id }), TestAction.deleteMany({ meetpunt: id })]);
    await TestMeetpunt.findByIdAndDelete(id);
    res.json({ message: 'Meetpunt verwijderd.', metingen, acties });
  } catch (err) { fail(res, err, 'Kon meetpunt niet verwijderen.'); }
});

// ---------------------------------------------------------------- metingen (per meetpunt and school year)
router.get('/metingen', schoolScope, async (req, res) => {
  res.json(await TestMeting.find({ school: req.schoolId, schoolYear: { $gte: FIRST_MEASURE_YEAR } }).lean());
});

// PUT /api/test/metingen  { school, meetpunt, schoolYear, value?, beoordeling?, comment? }
router.put('/metingen', schoolScope, async (req, res) => {
  try {
    const { meetpunt: meetpuntId, schoolYear } = req.body || {};
    checkYear(schoolYear, FIRST_MEASURE_YEAR, 'Metingen');
    const mp = await TestMeetpunt.findOne({ _id: meetpuntId, school: req.schoolId });
    if (!mp) return res.status(404).json({ message: 'Meetpunt niet gevonden.' });

    const set = { updatedBy: req.user._id };
    if ('value' in req.body) {
      const raw = req.body.value;
      if (raw === '' || raw === null || raw === undefined) set.value = null;
      else if (mp.valueType === 'tekst') set.value = String(raw).slice(0, 5000);
      else {
        const n = Number(String(raw).replace(',', '.'));
        if (!Number.isFinite(n)) throw new Error('Geef een getal in.');
        if (mp.valueType === 'percentage' && (n < 0 || n > 100)) throw new Error('Een percentage ligt tussen 0 en 100.');
        set.value = n;
      }
    }
    if ('beoordeling' in req.body) {
      if (![null, '', 'groen', 'rood'].includes(req.body.beoordeling)) throw new Error('Ongeldige beoordeling.');
      set.beoordeling = req.body.beoordeling || null;
    }
    if ('comment' in req.body) set.comment = String(req.body.comment || '').slice(0, 5000);

    const key = { school: req.schoolId, meetpunt: mp._id, schoolYear };
    const meting = await TestMeting.findOneAndUpdate(key, { $set: set, $setOnInsert: key }, { upsert: true, new: true, setDefaultsOnInsert: true });
    if ((meting.value === null || meting.value === '') && !meting.beoordeling && !meting.comment) {
      await meting.deleteOne();
      return res.json({ deleted: true, meetpunt: String(mp._id), schoolYear });
    }
    res.json(meting);
  } catch (err) { fail(res, err, 'Kon meting niet opslaan.'); }
});

// ---------------------------------------------------------------- acties (task dashboard)
const ACTION_FIELDS = ['title', 'description', 'owner', 'dueDate', 'status'];

function actionFields(body) {
  const f = pick(body, ACTION_FIELDS);
  if (f.dueDate === '') f.dueDate = null;
  if (f.status !== undefined && !TestAction.STATUSES.includes(f.status)) throw new Error('Ongeldige status.');
  if (f.status !== undefined) f.completedAt = f.status === 'afgerond' ? new Date() : null;
  return f;
}

router.get('/actions', schoolScope, async (req, res) => {
  res.json(await TestAction.find({ school: req.schoolId }).sort({ status: 1, dueDate: 1, createdAt: -1 }).lean());
});

router.post('/actions', schoolScope, async (req, res) => {
  try {
    checkYear(req.body.schoolYear, FIRST_MEASURE_YEAR, 'Acties');
    if (!(await TestMeetpunt.exists({ _id: req.body.meetpunt, school: req.schoolId }))) throw new Error('Meetpunt niet gevonden.');
    const f = actionFields(req.body);
    res.status(201).json(await TestAction.create({ ...f, school: req.schoolId, meetpunt: req.body.meetpunt, schoolYear: req.body.schoolYear, createdBy: req.user._id }));
  } catch (err) { fail(res, err, 'Kon actie niet aanmaken.'); }
});

router.put('/actions/:id', owned(TestAction, 'Actie'), async (req, res) => {
  try {
    const action = await TestAction.findByIdAndUpdate(req.params.id, actionFields(req.body), { new: true, runValidators: true });
    if (!action) return res.status(404).json({ message: 'Actie niet gevonden.' });
    res.json(action);
  } catch (err) { fail(res, err, 'Kon actie niet bijwerken.'); }
});

router.delete('/actions/:id', owned(TestAction, 'Actie'), async (req, res) => {
  await TestAction.findByIdAndDelete(req.params.id);
  res.json({ message: 'Actie verwijderd.' });
});

module.exports = router;
