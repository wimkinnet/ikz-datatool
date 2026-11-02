const mongoose = require('mongoose');

// A school's operational goal for one school year (from 2026-2027). It contributes to ROK expectations and, optionally,
// to signals and strategic goals. Its domeinen and meetpunten follow from its signals.
const testGoalSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    schoolYear: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    rok: [{ type: String }], // ROK codes, e.g. ['R1', 'BL6']
    signals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestSignal' }], // optional: signals it contributes to
    strategic: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestStrategicGoal' }], // optional: strategic goals it contributes to
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

testGoalSchema.index({ school: 1, schoolYear: 1 });

module.exports = mongoose.model('TestGoal', testGoalSchema);
