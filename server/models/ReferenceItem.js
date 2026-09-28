const mongoose = require('mongoose');

// One collection for all dropdown lists (formerly the "Verwijzigen" tab).
// list: status | rok | doorlichtingsdomein | schaal | onderdeel | inschaling | maand
const referenceItemSchema = new mongoose.Schema(
  {
    list: { type: String, required: true, index: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    parent: { type: String }, // for 'onderdeel': the schaal it belongs to
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

referenceItemSchema.index({ list: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('ReferenceItem', referenceItemSchema);
