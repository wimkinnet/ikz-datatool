const mongoose = require('mongoose');

// A signal a consultant defines for a school: based on a domein, with its own measure and the value it started from. Its code is the category letter + a number per school and category (C1, P1, P2, R1, ...): the number
// is stored, so codes stay the same when another signal is deleted. Signals span school years.
const testSignalSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    domain: { type: mongoose.Schema.Types.ObjectId, ref: 'TestResult', required: true },
    category: { type: String, enum: ['context', 'proces', 'resultaten'], required: true },
    number: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    measure: { type: String, required: true, trim: true }, // what is measured
    valueType: { type: String, enum: ['percentage', 'absoluut', 'tekst'], default: 'absoluut' },
    startValue: { type: mongoose.Schema.Types.Mixed, default: null }, // number, or text for valueType 'tekst'
    startYear: { type: String, default: '' }, // the school year the start value comes from
  },
  { timestamps: true }
);

testSignalSchema.index({ school: 1, category: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('TestSignal', testSignalSchema);
