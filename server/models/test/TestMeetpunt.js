const mongoose = require('mongoose');

// A measuring point at one moment, with its measurement: an indicator measures the success of an operational goal,
// the optional meetpunt of an action measures the success of that action. Goals belong to one school year, so each
// meetpunt has one month and one value.
const VALUE_TYPES = ['percentage', 'absoluut', 'tekst'];

const testMeetpuntSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    kind: { type: String, enum: ['indicator', 'actie'], required: true },
    goal: { type: mongoose.Schema.Types.ObjectId, ref: 'TestGoal', required: true },
    action: { type: mongoose.Schema.Types.ObjectId, ref: 'TestAction', default: null }, // kind 'actie' only
    title: { type: String, required: true, trim: true },
    uitleg: { type: String, default: '' },
    bron: { type: String, default: '' },
    month: { type: String, required: true }, // the moment of measuring, within the goal's school year
    valueType: { type: String, enum: VALUE_TYPES, default: 'absoluut' },
    threshold: { type: Number, default: null }, // numeric types only, optional
    thresholdDirection: { type: String, enum: ['min', 'max'], default: 'min' }, // min: value >= threshold is op niveau
    thresholdText: { type: String, default: '' }, // threshold for text points, or a note
    value: { type: mongoose.Schema.Types.Mixed, default: null }, // number, or text for 'tekst' points
    beoordeling: { type: String, enum: ['groen', 'rood', null], default: null }, // resultaat: op niveau / onder niveau
    comment: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

testMeetpuntSchema.index({ school: 1, goal: 1 });
// An action has at most one meetpunt
testMeetpuntSchema.index({ action: 1 }, { unique: true, partialFilterExpression: { kind: 'actie' } });

module.exports = mongoose.model('TestMeetpunt', testMeetpuntSchema);
module.exports.VALUE_TYPES = VALUE_TYPES;
