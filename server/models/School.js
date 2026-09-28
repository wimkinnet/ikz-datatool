const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, default: 'BaO' }, // basisonderwijs; kept free-text for future school types
    institutionNumber: { type: String, trim: true },
    city: { type: String, trim: true },
    contactName: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    notes: { type: String },
    active: { type: Boolean, default: true },
    // If false (default) the school's own users can fill in the questionnaire and update status/actions
    // on their year plan, but only consultants/admins can add or remove plan items and change thresholds.
    clientCanEditPlanStructure: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);
