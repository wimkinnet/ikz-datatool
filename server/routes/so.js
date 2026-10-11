const express = require('express');
const router = express.Router();
const RokExpectation = require('../models/RokExpectation');
const Indicator = require('../models/Indicator');
const IndicatorScore = require('../models/IndicatorScore');
const { protect, requireRole } = require('../middleware/auth');
const { schoolScope, requireSchoolType } = require('../middleware/access');
const { PLAN_MONTHS, SCHOOL_YEAR_RE } = require('../utils/constants');
const pick = require('../utils/pick');

// Secundair onderwijs: the Kwaliteitsmonitor (ROK expectations, indicators and each school's ratings)
router.use(protect);

const forSO = [schoolScope, requireSchoolType('SO')];
const FIELDS = ['source', 'group', 'bron', 'text', 'threshold', 'month', 'rok', 'order', 'active'];

function validate(body) {
  if (body.month && !PLAN_MONTHS.includes(body.month)) throw new Error('Ongeldige maand.');
  if (body.source !== undefined && !Indicator.SOURCES.includes(body.source)) throw new Error('Ongeldige bron.');
  if (body.rok !== undefined) body.rok = [...new Set((body.rok || []).map(String))];
}

// GET /api/so/rok
router.get('/rok', async (req, res) => {
  try {
    res.json(await RokExpectation.find().sort({ order: 1 }).lean());
  } catch (err) {
    res.status(500).json({ message: 'Kon het ROK niet laden.', error: err.message });
  }
});

// GET /api/so/indicators   (admins can add ?all=1 to include inactive indicators)
router.get('/indicators', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' && req.query.all ? {} : { active: true };
    res.json(await Indicator.find(filter).sort({ source: 1, order: 1 }).lean());
  } catch (err) {
    res.status(500).json({ message: 'Kon indicatoren niet laden.', error: err.message });
  }
});

router.post('/indicators', requireRole('admin'), async (req, res) => {
  try {
    const body = pick(req.body, FIELDS);
    validate(body);
    const last = await Indicator.findOne({ source: body.source }).sort({ order: -1 });
    body.order = body.order || (last ? last.order + 1 : 1);
    body.key = `${body.source}-n${Date.now().toString(36)}`;
    res.status(201).json(await Indicator.create(body));
  } catch (err) {
    res.status(400).json({ message: err.message || 'Kon indicator niet aanmaken.' });
  }
});

router.put('/indicators/:id', requireRole('admin'), async (req, res) => {
  try {
    const body = pick(req.body, FIELDS);
    validate(body);
    const ind = await Indicator.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!ind) return res.status(404).json({ message: 'Indicator niet gevonden.' });
    res.json(ind);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Kon indicator niet bijwerken.' });
  }
});

// Only indicators no school has rated can be deleted; otherwise deactivate them
router.delete('/indicators/:id', requireRole('admin'), async (req, res) => {
  try {
    const ind = await Indicator.findById(req.params.id);
    if (!ind) return res.status(404).json({ message: 'Indicator niet gevonden.' });
    if (await IndicatorScore.exists({ indicatorKey: ind.key })) {
      return res.status(409).json({ message: 'Scholen hebben deze indicator al ingeschaald. Zet hem op "inactief" in plaats van te verwijderen.' });
    }
    await ind.deleteOne();
    res.json({ message: 'Indicator verwijderd.' });
  } catch (err) {
    res.status(400).json({ message: 'Kon indicator niet verwijderen.', error: err.message });
  }
});

// GET /api/so/scores?school=&year=
router.get('/scores', forSO, async (req, res) => {
  try {
    if (!SCHOOL_YEAR_RE.test(req.query.year || '')) return res.status(400).json({ message: 'Ongeldig schooljaar.' });
    res.json(await IndicatorScore.find({ school: req.schoolId, schoolYear: req.query.year }).lean());
  } catch (err) {
    res.status(500).json({ message: 'Kon inschalingen niet laden.', error: err.message });
  }
});

// PUT /api/so/scores  { school, schoolYear, indicatorKey, inschaling?, month?, threshold?, action? }
router.put('/scores', forSO, async (req, res) => {
  try {
    const { schoolYear, indicatorKey } = req.body || {};
    if (!SCHOOL_YEAR_RE.test(schoolYear || '')) return res.status(400).json({ message: 'Ongeldig schooljaar.' });
    if (!(await Indicator.exists({ key: indicatorKey, active: true }))) return res.status(404).json({ message: 'Indicator niet gevonden.' });

    const set = { updatedBy: req.user._id };
    if ('inschaling' in req.body) {
      const v = req.body.inschaling === '' || req.body.inschaling === null ? null : Number(req.body.inschaling);
      if (![null, -1, 0, 1].includes(v)) return res.status(400).json({ message: 'Ongeldige inschaling.' });
      set.inschaling = v;
    }
    if ('month' in req.body) {
      if (req.body.month && !PLAN_MONTHS.includes(req.body.month)) return res.status(400).json({ message: 'Ongeldige maand.' });
      set.month = req.body.month || '';
    }
    if ('threshold' in req.body) set.threshold = String(req.body.threshold || '').slice(0, 1000);
    if ('action' in req.body) set.action = String(req.body.action || '').slice(0, 5000);

    const key = { school: req.schoolId, schoolYear, indicatorKey };
    const score = await IndicatorScore.findOneAndUpdate(key, { $set: set, $setOnInsert: key }, { upsert: true, new: true, setDefaultsOnInsert: true });
    if (score.inschaling === null && !score.month && !score.threshold && !score.action) {
      await score.deleteOne();
      return res.json({ deleted: true, schoolYear, indicatorKey });
    }
    res.json(score);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Kon inschaling niet opslaan.' });
  }
});

module.exports = router;
