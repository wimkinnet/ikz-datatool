const mongoose = require('mongoose');

// SO: one quality expectation of the ROK (referentiekader voor onderwijskwaliteit), e.g. R1, K2, BL7.
const rokExpectationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    domain: { type: String, default: '' }, // e.g. "Resultaten en effecten"
    title: { type: String, required: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RokExpectation', rokExpectationSchema);
