const mongoose = require('mongoose');

// A measuring point a school defines under one or more domeinen (not necessarily the same for every school).
// Its values per school year are TestMeting documents, so history (from 2024-2025) is kept.
const VALUE_TYPES = ['percentage', 'absoluut', 'tekst'];

const testMeetpuntSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    results: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestResult' }],
      validate: { validator: (v) => v.length > 0, message: 'Kies minstens één domein.' },
    },
    title: { type: String, required: true, trim: true },
    uitleg: { type: String, default: '' },
    bron: { type: String, default: '' },
    month: { type: String, default: '' }, // month in which the evaluation happens
    valueType: { type: String, enum: VALUE_TYPES, default: 'absoluut' },
    threshold: { type: Number, default: null }, // numeric types only, optional
    thresholdDirection: { type: String, enum: ['min', 'max'], default: 'min' }, // min: value >= threshold is green
    thresholdText: { type: String, default: '' }, // threshold for text points, or a note
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

testMeetpuntSchema.index({ school: 1, results: 1 });

module.exports = mongoose.model('TestMeetpunt', testMeetpuntSchema);
module.exports.VALUE_TYPES = VALUE_TYPES;
