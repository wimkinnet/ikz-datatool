const express = require('express');
const router = express.Router();
const RokExpectation = require('../models/RokExpectation');
const { protect } = require('../middleware/auth');

// GET /api/rok - the ROK (referentiekader voor onderwijskwaliteit): every quality expectation per ROK-domein
router.get('/', protect, async (req, res) => {
  try {
    res.json(await RokExpectation.find().sort({ order: 1 }).lean());
  } catch (err) {
    res.status(500).json({ message: 'Kon het ROK niet laden.', error: err.message });
  }
});

module.exports = router;
