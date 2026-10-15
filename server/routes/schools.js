const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const School = require('../models/School');
const User = require('../models/User');
const Document = require('../models/Document');
const TestGoal = require('../models/test/TestGoal');
const TestMeetpunt = require('../models/test/TestMeetpunt');
const TestMeting = require('../models/test/TestMeting');
const TestAction = require('../models/test/TestAction');
const { UPLOAD_ROOT } = require('../middleware/upload');
const { protect, requireRole, requireStaff } = require('../middleware/auth');
const { schoolIdsOf, canAccessSchool } = require('../middleware/access');
const pick = require('../utils/pick');

router.use(protect);

const FIELDS = ['name', 'institutionNumber', 'city', 'contactName', 'contactEmail', 'contactPhone', 'notes', 'active'];

// GET /api/schools  - only the schools the user may access
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { _id: { $in: schoolIdsOf(req.user) } };
    const schools = await School.find(filter).sort({ name: 1 });
    res.json(schools);
  } catch (err) {
    res.status(500).json({ message: 'Kon scholen niet laden.', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  if (!canAccessSchool(req.user, req.params.id)) return res.status(403).json({ message: 'Je hebt geen toegang tot deze school.' });
  const school = await School.findById(req.params.id);
  if (!school) return res.status(404).json({ message: 'School niet gevonden.' });
  res.json(school);
});

// POST /api/schools  (admin)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const school = await School.create(pick(req.body, FIELDS));
    res.status(201).json(school);
  } catch (err) {
    res.status(400).json({ message: 'Kon school niet aanmaken.', error: err.message });
  }
});

// PUT /api/schools/:id  (admin, or consultant of that school)
router.put('/:id', requireStaff, async (req, res) => {
  try {
    if (!canAccessSchool(req.user, req.params.id)) return res.status(403).json({ message: 'Je hebt geen toegang tot deze school.' });
    const fields = pick(req.body, FIELDS);
    const school = await School.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
    if (!school) return res.status(404).json({ message: 'School niet gevonden.' });
    res.json(school);
  } catch (err) {
    res.status(400).json({ message: 'Kon school niet bijwerken.', error: err.message });
  }
});

// DELETE /api/schools/:id  (admin) - removes the school with its goals, meetpunten, metingen, actions and documents,
// plus the school accounts that were linked to this school only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    if (!canAccessSchool(req.user, req.params.id)) return res.status(400).json({ message: 'Ongeldige school.' });
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School niet gevonden.' });
    const id = school._id;
    const linkedClients = await User.find({ role: 'client', $or: [{ school: id }, { schools: id }] }).select('_id');
    await Promise.all([
      Document.deleteMany({ school: id }),
      TestGoal.deleteMany({ school: id }),
      TestMeetpunt.deleteMany({ school: id }),
      TestMeting.deleteMany({ school: id }),
      TestAction.deleteMany({ school: id }),
      User.updateMany({ schools: id }, { $pull: { schools: id } }),
      User.updateMany({ school: id }, { $set: { school: null } }),
    ]);
    await User.deleteMany({ _id: { $in: linkedClients.map((u) => u._id) }, school: null, schools: { $size: 0 } });
    fs.rm(path.join(UPLOAD_ROOT, String(id)), { recursive: true, force: true }, () => {});
    await school.deleteOne();
    res.json({ message: 'School verwijderd.' });
  } catch (err) {
    res.status(400).json({ message: 'Kon school niet verwijderen.', error: err.message });
  }
});

module.exports = router;
