const Visit = require('../models/Visit');

const VISIT_GAP = 30 * 60 * 1000; // a longer silence starts a new visit
const WRITE_EVERY = 60 * 1000; // one page makes many requests; update the log at most once a minute per user
const lastWrite = new Map();

// Logs the activity of school users. Never awaited by a request and never fails one.
async function recordVisit(user) {
  if (user.role !== 'client') return;
  const id = String(user._id);
  const now = Date.now();
  if (now - (lastWrite.get(id) || 0) < WRITE_EVERY) return;
  lastWrite.set(id, now);
  try {
    const open = await Visit.findOneAndUpdate(
      { user: user._id, lastSeenAt: { $gte: new Date(now - VISIT_GAP) } },
      { lastSeenAt: new Date(now) },
      { sort: { lastSeenAt: -1 } }
    );
    if (!open) await Visit.create({ user: user._id, startedAt: new Date(now), lastSeenAt: new Date(now) });
  } catch (err) {
    console.error('Visit log error:', err.message);
  }
}

module.exports = { recordVisit };
