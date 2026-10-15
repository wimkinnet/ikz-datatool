const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    institutionNumber: { type: String, trim: true },
    city: { type: String, trim: true },
    contactName: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    notes: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);
