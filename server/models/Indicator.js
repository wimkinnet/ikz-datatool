const mongoose = require('mongoose');

// SO template: one indicator from the Kwaliteitsmonitor (a row on a source tab such as Smartschool or Datawijzer).
// Each indicator exists once and is linked to the ROK expectations it gives evidence for.
const SOURCES = ['smartschool', 'datawijzer', 'dataloep', 'andere', 'vakwerkgroepen', 'llnbgl'];

const indicatorSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    source: { type: String, enum: SOURCES, required: true }, // the source tab
    group: { type: String, default: '' }, // section on that tab, e.g. "Educheck"
    bron: { type: String, default: '' }, // "BRON" column, e.g. "smartschool analytics"
    text: { type: String, required: true, trim: true }, // "INDICATOR"
    threshold: { type: String, default: '' }, // "DREMPELWAARDE"
    month: { type: String, default: '' }, // default monitoring month (september … augustus)
    rok: [{ type: String }], // ROK codes, e.g. ['R1', 'K2']
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Indicator', indicatorSchema);
module.exports.SOURCES = SOURCES;
