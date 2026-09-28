const mongoose = require('mongoose');

// One school's answer to one question in one school year (a value + comment cell in the Excel).
const answerSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    schoolYear: { type: String, required: true }, // e.g. "2026-2027"
    questionKey: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    comment: { type: String, default: '' }, // written by the school ("evolutie/opmerkingen")
    consultantNote: { type: String, default: '' }, // advice from the consultant, visible to the school
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

answerSchema.index({ school: 1, schoolYear: 1, questionKey: 1 }, { unique: true });

module.exports = mongoose.model('Answer', answerSchema);
