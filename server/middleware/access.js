const mongoose = require('mongoose');
const School = require('../models/School');

// Central place that decides which school a user may touch.
//  admin      -> every school
//  consultant -> only schools listed in user.schools
//  client     -> only user.school (the request's ?school= value is ignored for them)
function canAccessSchool(user, schoolId) {
  if (!schoolId) return false;
  const id = String(schoolId);
  if (!mongoose.isValidObjectId(id)) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'client') return !!user.school && String(user.school) === id;
  if (user.role === 'consultant') return (user.schools || []).some((s) => String(s) === id);
  return false;
}

// Resolves req.schoolId from ?school= / body.school and enforces access.
async function schoolScope(req, res, next) {
  try {
    let id = (req.query && req.query.school) || (req.body && req.body.school);
    if (req.user.role === 'client') id = req.user.school;
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

module.exports = { canAccessSchool, schoolScope };
