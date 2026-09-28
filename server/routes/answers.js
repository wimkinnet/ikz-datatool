const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const Document = require('../models/Document');
const ReferenceItem = require('../models/ReferenceItem');
const { protect } = require('../middleware/auth');
const { schoolScope } = require('../middleware/access');
const { SCHOOL_YEAR_RE } = require('../utils/constants');
const { numericValue } = require('../utils/answerValues');
const { computeProgress } = require('../utils/progress');

router.use(protect, schoolScope);

async function coerceValue(question, raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  switch (question.answerType) {
    case 'number':
    case 'percentage':
    case 'scale10': {
      const n = Number(String(raw).replace(',', '.'));
      if (!Number.isFinite(n)) throw new Error('Geef een getal in.');
      if (question.answerType === 'percentage' && (n < 0 || n > 100)) throw new Error('Een percentage ligt tussen 0 en 100.');
      if (question.answerType === 'scale10' && (n < 0 || n > 10)) throw new Error('Een score ligt tussen 0 en 10.');
      return n;
    }
    case 'inschaling': {
      const ok = await ReferenceItem.exists({ list: 'inschaling', key: String(raw) });
      if (!ok) throw new Error('Onbekende inschaling.');
      return String(raw);
    }
    default:
      return String(raw).slice(0, 5000);
  }
}

// GET /api/answers?school=&years=2025-2026,2026-2027&month=oktober
router.get('/', async (req, res) => {
  try {
    const years = String(req.query.years || '').split(',').filter((y) => SCHOOL_YEAR_RE.test(y));
    if (!years.length) return res.status(400).json({ message: 'Geef minstens één schooljaar op (bv. 2026-2027).' });

    const filter = { school: req.schoolId, schoolYear: { $in: years } };
    if (req.query.month) {
      const keys = (await Question.find({ month: req.query.month }).select('key').lean()).map((q) => q.key);
      filter.questionKey = { $in: keys };
    }
    const answers = await Answer.find(filter).lean();

    const attachments = await Document.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(req.schoolId), schoolYear: { $in: years }, questionKey: { $ne: '' } } },
      { $group: { _id: { schoolYear: '$schoolYear', questionKey: '$questionKey' }, count: { $sum: 1 } } },
    ]);
    res.json({
      answers,
      attachments: attachments.map((a) => ({ schoolYear: a._id.schoolYear, questionKey: a._id.questionKey, count: a.count })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Kon antwoorden niet laden.', error: err.message });
  }
});

// PUT /api/answers  { school, schoolYear, questionKey, value?, comment?, consultantNote? }
router.put('/', async (req, res) => {
  try {
    const { schoolYear, questionKey } = req.body || {};
    if (!SCHOOL_YEAR_RE.test(schoolYear || '')) return res.status(400).json({ message: 'Ongeldig schooljaar.' });
    const question = await Question.findOne({ key: questionKey, active: true });
    if (!question) return res.status(404).json({ message: 'Vraag niet gevonden.' });
    if (question.sumOf && question.sumOf.length) {
      return res.status(400).json({ message: 'Dit is een berekend totaal en kan niet ingevuld worden.' });
    }

    const set = { updatedBy: req.user._id };
    if ('value' in req.body) set.value = await coerceValue(question, req.body.value);
    if ('comment' in req.body) set.comment = String(req.body.comment || '').slice(0, 5000);
    // Only consultants/admins write advice; school users can read it
    if ('consultantNote' in req.body && req.user.role !== 'client') set.consultantNote = String(req.body.consultantNote || '').slice(0, 5000);

    const key = { school: req.schoolId, schoolYear, questionKey };
    const answer = await Answer.findOneAndUpdate(key, { $set: set, $setOnInsert: key }, { upsert: true, new: true, setDefaultsOnInsert: true });

    const empty = (answer.value === null || answer.value === undefined || answer.value === '') && !answer.comment && !answer.consultantNote;
    if (empty) {
      await answer.deleteOne();
      return res.json({ deleted: true, schoolYear, questionKey });
    }
    res.json(answer);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Kon antwoord niet opslaan.' });
  }
});

// GET /api/answers/progress?school=&year=
router.get('/progress', async (req, res) => {
  try {
    if (!SCHOOL_YEAR_RE.test(req.query.year || '')) return res.status(400).json({ message: 'Ongeldig schooljaar.' });
    res.json(await computeProgress(req.schoolId, req.query.year));
  } catch (err) {
    res.status(500).json({ message: 'Kon voortgang niet berekenen.', error: err.message });
  }
});

// GET /api/answers/trend?school=&questionKey=  -> one value per school year
router.get('/trend', async (req, res) => {
  try {
    const question = await Question.findOne({ key: req.query.questionKey }).lean();
    if (!question) return res.status(404).json({ message: 'Vraag niet gevonden.' });
    if (question.answerType === 'text') return res.status(400).json({ message: 'Tekstvragen kunnen niet in een grafiek getoond worden.' });

    const keys = [question.key, ...(question.sumOf || [])];
    const answers = await Answer.find({ school: req.schoolId, questionKey: { $in: keys } }).lean();
    const byYear = {};
    for (const a of answers) (byYear[a.schoolYear] = byYear[a.schoolYear] || {})[a.questionKey] = a.value;

    let ordinal = null;
    if (question.answerType === 'inschaling') {
      const list = await ReferenceItem.find({ list: 'inschaling', active: true }).sort({ order: 1 }).lean();
      ordinal = list.map((i) => i.key);
    }

    const points = Object.keys(byYear).sort().map((schoolYear) => {
      if (ordinal) {
        const label = byYear[schoolYear][question.key];
        const idx = ordinal.indexOf(label);
        return { schoolYear, value: idx === -1 ? null : idx + 1, label: label || null };
      }
      return { schoolYear, value: numericValue(question, byYear[schoolYear]) };
    });
    res.json({ question, points, scale: ordinal });
  } catch (err) {
    res.status(500).json({ message: 'Kon trend niet berekenen.', error: err.message });
  }
});

module.exports = router;
