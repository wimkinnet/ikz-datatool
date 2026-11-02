const mongoose = require('mongoose');

// A school's strategic goal, numbered per school (S1, S2, ...). The number is stored, so codes stay the same
// when another goal is deleted. Strategic goals span school years.
const testStrategicGoalSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    number: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

testStrategicGoalSchema.index({ school: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('TestStrategicGoal', testStrategicGoalSchema);
