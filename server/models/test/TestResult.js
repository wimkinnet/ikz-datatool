const mongoose = require('mongoose');

// Test: a "beoogd resultaat" from the shared library (seeded from the themes of the BO year plan).
// Operational goals link to these; each school hangs its own meetpunten under them.
const CATEGORIES = ['proces', 'resultaten', 'context'];

const testResultSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TestResult', testResultSchema);
module.exports.CATEGORIES = CATEGORIES;
