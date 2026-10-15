const mongoose = require('mongoose');

// A school's operational goal for one school year (from 2026-2027). It contributes to one or more
// ROK expectations and is linked to one or more domeinen.
const testGoalSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    schoolYear: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    rok: [{ type: String }], // ROK codes, e.g. ['R1', 'BL6']
    results: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestResult' }],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

testGoalSchema.index({ school: 1, schoolYear: 1 });

module.exports = mongoose.model('TestGoal', testGoalSchema);
