const mongoose = require('mongoose');

// One visit of a school user: from their first request until the last one, with no gap above 30 minutes
const visitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
});

visitSchema.index({ user: 1, lastSeenAt: -1 });
visitSchema.index({ startedAt: -1 });
// The log keeps personal data no longer than needed: MongoDB removes visits after a year
visitSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('Visit', visitSchema);
