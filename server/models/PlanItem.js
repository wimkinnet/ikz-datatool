const mongoose = require('mongoose');
const { STATUSES } = require('../utils/constants');

// A task/KPI row in the year plan (formerly the table on the "Dashboard" tab).
// school = null means: row of the default plan template that can be copied to a school.
const planItemSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    schoolYear: { type: String, default: null },
    month: { type: String, required: true },
    theme: { type: String, default: '' }, // "Thema / onderwerp"
    threshold: { type: String, default: '' }, // "Drempelwaarde" as free text, e.g. "minstens 80%"
    status: { type: String, enum: STATUSES, default: 'monitoren' },
    rok1: { type: String, default: '' },
    rok2: { type: String, default: '' },
    schaal: { type: String, default: '' },
    onderdeel: { type: String, default: '' },
    inschaling: { type: String, default: '' },
    source: { type: String, default: '' }, // "Waar te vinden"
    extraInfo: { type: String, default: '' },
    action: { type: String, default: '' },
    order: { type: Number, default: 0 },

    // Optional: tie the row to a questionnaire answer so the status follows the data automatically
    questionKey: { type: String, default: '' },
    thresholdValue: { type: Number, default: null },
    thresholdDirection: { type: String, enum: ['min', 'max'], default: 'min' }, // min: value must be >= threshold
    statusMode: { type: String, enum: ['manual', 'auto'], default: 'manual' },
  },
  { timestamps: true }
);

planItemSchema.index({ school: 1, schoolYear: 1 });

module.exports = mongoose.model('PlanItem', planItemSchema);
