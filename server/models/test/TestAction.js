const mongoose = require('mongoose');

// Test: an action linked to a measuring result (meetpunt + school year), followed up in the task dashboard.
const STATUSES = ['open', 'bezig', 'afgerond'];

const testActionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    meetpunt: { type: mongoose.Schema.Types.ObjectId, ref: 'TestMeetpunt', required: true },
    schoolYear: { type: String, required: true }, // the year of the measuring result it follows up
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: String, default: '' }, // verantwoordelijke (free text: a person or team)
    dueDate: { type: Date, default: null },
    status: { type: String, enum: STATUSES, default: 'open' },
    completedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

testActionSchema.index({ school: 1, status: 1 });

module.exports = mongoose.model('TestAction', testActionSchema);
module.exports.STATUSES = STATUSES;
