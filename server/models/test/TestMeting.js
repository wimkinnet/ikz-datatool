const mongoose = require('mongoose');

// Test: the result of one meetpunt in one school year (value + red/green assessment).
const testMetingSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    meetpunt: { type: mongoose.Schema.Types.ObjectId, ref: 'TestMeetpunt', required: true },
    schoolYear: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null }, // number, or text for 'tekst' points
    beoordeling: { type: String, enum: ['groen', 'rood', null], default: null },
    comment: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

testMetingSchema.index({ meetpunt: 1, schoolYear: 1 }, { unique: true });

module.exports = mongoose.model('TestMeting', testMetingSchema);
