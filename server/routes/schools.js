const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const School = require('../models/School');
const User = require('../models/User');
const Answer = require('../models/Answer');
const PlanItem = require('../models/PlanItem');
const Document = require('../models/Document');
const { UPLOAD_ROOT } = require('../middleware/upload');
const { protect, requireRole, requireStaff } = require('../middleware/auth');
const { schoolIdsOf, canAccessSchool } = require('../middleware/access');
const pick = require('../utils/pick');
const { SECTORS } = require('../utils/constants');

router.use(protect);

const FIELDS = ['name', 'type', 'institutionNumber', 'city', 'contactName', 'contactEmail', 'contactPhone', 'notes', 'active', 'clientCanEditPlanStructure'];

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
    if (!SECTORS.includes(req.body.type)) return res.status(400).json({ message: 'Kies of dit een school voor basisonderwijs (BO) of secundair onderwijs (SO) is.' });
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
    // Only an admin can change BO/SO, and only while the school has no SO data yet
    if (fields.type !== undefined) {
      const current = await School.findById(req.params.id).select('type');
      if (current && fields.type !== current.type) {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Enkel een admin kan het onderwijsniveau van een school wijzigen.' });
        if ((await Answer.exists({ school: req.params.id })) || (await PlanItem.exists({ school: req.params.id }))) {
          return res.status(409).json({ message: 'Deze school heeft al antwoorden of een jaarplan. Het onderwijsniveau kan niet meer gewijzigd worden.' });
        }
      }
    }
    const school = await School.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
    if (!school) return res.status(404).json({ message: 'School niet gevonden.' });
    res.json(school);
  } catch (err) {
    res.status(400).json({ message: 'Kon school niet bijwerken.', error: err.message });
  }
});

// DELETE /api/schools/:id  (admin) - removes the school with all its answers, plan and documents,
// plus the school accounts that were linked to this school only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    if (!canAccessSchool(req.user, req.params.id)) return res.status(400).json({ message: 'Ongeldige school.' });
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School niet gevonden.' });
    const id = school._id;
    const linkedClients = await User.find({ role: 'client', $or: [{ school: id }, { schools: id }] }).select('_id');
    await Promise.all([
      Answer.deleteMany({ school: id }),
      PlanItem.deleteMany({ school: id }),
      Document.deleteMany({ school: id }),
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
