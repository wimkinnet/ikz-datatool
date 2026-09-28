const express = require('express');
const router = express.Router();
const ReferenceItem = require('../models/ReferenceItem');
const { protect, requireRole } = require('../middleware/auth');
const pick = require('../utils/pick');

router.use(protect);

// GET /api/references  -> { status: [...], rok: [...], schaal: [...], onderdeel: [...], inschaling: [...], ... }
router.get('/', async (req, res) => {
  try {
    const items = await ReferenceItem.find(req.user.role === 'admin' && req.query.all ? {} : { active: true }).sort({ list: 1, order: 1 }).lean();
    const grouped = {};
    for (const it of items) (grouped[it.list] = grouped[it.list] || []).push(it);
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ message: 'Kon lijsten niet laden.', error: err.message });
  }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const body = pick(req.body, ['list', 'key', 'label', 'parent', 'order', 'active']);
    if (!body.key) body.key = body.parent ? `${body.parent}|${body.label}` : body.label;
    res.status(201).json(await ReferenceItem.create(body));
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ message: err.code === 11000 ? 'Dit item bestaat al in de lijst.' : 'Kon item niet aanmaken.', error: err.message });
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    // key stays fixed (existing plan rows refer to it); only label/order/active/parent can change
    const item = await ReferenceItem.findByIdAndUpdate(req.params.id, pick(req.body, ['label', 'order', 'active', 'parent']), { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Item niet gevonden.' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: 'Kon item niet bijwerken.', error: err.message });
  }
});

// Deleting hides the item instead (existing plan rows keep their value)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const item = await ReferenceItem.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!item) return res.status(404).json({ message: 'Item niet gevonden.' });
  res.json({ message: 'Item verborgen.' });
});

module.exports = router;
