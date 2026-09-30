const mongoose = require('mongoose');
const School = require('../models/School');

// Schools a non-admin user is linked to (as strings).
// Consultants and school users both use user.schools; older school accounts may still have the single user.school.
function schoolIdsOf(user) {
  const ids = (user.schools || []).map(String);
  if (user.role === 'client' && user.school && !ids.includes(String(user.school))) ids.unshift(String(user.school));
  return ids;
}

// Central place that decides which school a user may touch.
//  admin               -> every school
//  consultant / client -> only the schools they are linked to
function canAccessSchool(user, schoolId) {
  if (!schoolId) return false;
  const id = String(schoolId);
  if (!mongoose.isValidObjectId(id)) return false;
  if (user.role === 'admin') return true;
  return schoolIdsOf(user).includes(id);
}

// Resolves req.schoolId from ?school= / body.school and enforces access.
async function schoolScope(req, res, next) {
  try {
    let id = (req.query && req.query.school) || (req.body && req.body.school);
    if (!id && req.user.role === 'client') id = schoolIdsOf(req.user)[0]; // school user with a single school
    if (!id) return res.status(400).json({ message: 'Geen school opgegeven.' });
    if (!canAccessSchool(req.user, id)) {
      return res.status(403).json({ message: 'Je hebt geen toegang tot deze school.' });
    }
    const school = await School.findById(id);
    if (!school) return res.status(404).json({ message: 'School niet gevonden.' });
    req.schoolId = String(school._id);
    req.school = school;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Kon school niet controleren.', error: err.message });
  }
}

module.exports = { schoolIdsOf, canAccessSchool, schoolScope };
