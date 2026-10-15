const mongoose = require('mongoose');

// A "domein" from the shared list (seeded from the themes of the former BO year plan); stored as TestResult.
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
