const mongoose = require('mongoose');

// SO: one school's rating of one indicator in one school year (inschaling, monitoring month, action).
const indicatorScoreSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    schoolYear: { type: String, required: true },
    indicatorKey: { type: String, required: true },
    inschaling: { type: Number, enum: [-1, 0, 1, null], default: null }, // 1 op niveau, 0 opvolgen, -1 actie nodig
    month: { type: String, default: '' }, // monitoring month; empty = the indicator's default month
    threshold: { type: String, default: '' }, // the school's own threshold; empty = the template's
    action: { type: String, default: '' }, // "opmerking/actie"
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

indicatorScoreSchema.index({ school: 1, schoolYear: 1, indicatorKey: 1 }, { unique: true });

module.exports = mongoose.model('IndicatorScore', indicatorScoreSchema);
