const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { protect, requireRole } = require('../middleware/auth');
const { monthIndex, PLAN_MONTHS } = require('../utils/constants');
const pick = require('../utils/pick');

router.use(protect);

const FIELDS = ['month', 'section', 'group', 'text', 'answerType', 'unit', 'order', 'active', 'sumOf'];

// GET /api/questions?month=oktober   (admins can add ?all=1 to include inactive questions)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (!(req.user.role === 'admin' && req.query.all)) filter.active = true;
    const questions = await Question.find(filter).lean();
    questions.sort((a, b) => monthIndex(a.month) - monthIndex(b.month) || a.order - b.order);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Kon vragen niet laden.', error: err.message });
  }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const body = pick(req.body, FIELDS);
    if (!PLAN_MONTHS.includes(body.month)) return res.status(400).json({ message: 'Ongeldige maand.' });
    const last = await Question.findOne({ month: body.month }).sort({ order: -1 });
    body.order = body.order || (last ? last.order + 1 : 1);
    body.key = `${body.month}-x${Date.now().toString(36)}`;
    res.status(201).json(await Question.create(body));
  } catch (err) {
    res.status(400).json({ message: 'Kon vraag niet aanmaken.', error: err.message });
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS), { new: true, runValidators: true });
    if (!q) return res.status(404).json({ message: 'Vraag niet gevonden.' });
    res.json(q);
  } catch (err) {
    res.status(400).json({ message: 'Kon vraag niet bijwerken.', error: err.message });
  }
});

// Only questions nobody has answered can be deleted; otherwise deactivate them
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const q = await Question.findById(req.params.id);
    if (!q) return res.status(404).json({ message: 'Vraag niet gevonden.' });
    if (await Answer.exists({ questionKey: q.key })) {
      return res.status(409).json({ message: 'Er zijn al antwoorden op deze vraag. Zet ze op "inactief" in plaats van te verwijderen.' });
    }
    await q.deleteOne();
    res.json({ message: 'Vraag verwijderd.' });
  } catch (err) {
    res.status(400).json({ message: 'Kon vraag niet verwijderen.', error: err.message });
  }
});

module.exports = router;
