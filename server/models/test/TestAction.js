const mongoose = require('mongoose');

// An action of an operational goal. Its success can optionally be measured by one meetpunt (TestMeetpunt, kind 'actie').
const STATUSES = ['in_te_plannen', 'gepland', 'in_uitvoering', 'uitgevoerd'];

const testActionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    goal: { type: mongoose.Schema.Types.ObjectId, ref: 'TestGoal', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: String, default: '' }, // verantwoordelijke (free text: a person or team)
    dueDate: { type: Date, default: null },
    status: { type: String, enum: STATUSES, default: 'in_te_plannen', required: true },
    completedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

testActionSchema.index({ school: 1, goal: 1 });

module.exports = mongoose.model('TestAction', testActionSchema);
module.exports.STATUSES = STATUSES;
