const mongoose = require('mongoose');
const { ANSWER_TYPES } = require('../utils/constants');

// The questionnaire (formerly the monthly "IKZ ..." tabs). Shared by all schools.
const questionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    month: { type: String, required: true },
    section: { type: String, default: '' },
    group: { type: String, default: '' },
    text: { type: String, required: true, trim: true },
    answerType: { type: String, enum: ANSWER_TYPES, default: 'text' },
    unit: { type: String, default: '' },
    order: { type: Number, default: 0 },
    // Keys of other questions whose values are added up to produce this one (read-only in the UI)
    sumOf: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);
