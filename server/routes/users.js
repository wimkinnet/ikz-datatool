const express = require('express');
const router = express.Router();
const User = require('../models/User');
const School = require('../models/School');
const { protect, requireRole, requireStaff } = require('../middleware/auth');
const { canAccessSchool } = require('../middleware/access');
const pick = require('../utils/pick');

router.use(protect, requireStaff);

// A consultant may only see/manage school users (role=client) of their own schools.
function canManage(actor, target) {
  if (actor.role === 'admin') return true;
  return target.role === 'client' && canAccessSchool(actor, target.school);
}

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { role: 'client', school: { $in: req.user.schools } };
    const users = await User.find(filter).sort({ role: 1, name: 1 });
    res.json(users.map((u) => u.toSafeObject()));
  } catch (err) {
    res.status(500).json({ message: 'Kon gebruikers niet laden.', error: err.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};
    let { role, school, schools } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Naam, e-mailadres en wachtwoord zijn verplicht.' });
    if (password.length < 8) return res.status(400).json({ message: 'Het wachtwoord moet minstens 8 tekens hebben.' });

    if (req.user.role !== 'admin') role = 'client'; // consultants can only invite school users
    if (!['admin', 'consultant', 'client'].includes(role)) role = 'client';

    if (role === 'client') {
      if (!school || !canAccessSchool(req.user, school) || !(await School.exists({ _id: school }))) {
        return res.status(400).json({ message: 'Kies een school (waartoe je toegang hebt) voor dit schoolaccount.' });
      }
      schools = [];
    } else {
      school = null;
      if (role === 'admin') schools = [];
    }

    if (await User.findOne({ email: String(email).toLowerCase().trim() })) {
      return res.status(409).json({ message: 'Er bestaat al een gebruiker met dit e-mailadres.' });
    }

    const user = await User.create({ name, email, password, phone, role, school, schools: schools || [] });
    res.status(201).json(user.toSafeObject());
  } catch (err) {
    res.status(400).json({ message: 'Kon gebruiker niet aanmaken.', error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Gebruiker niet gevonden.' });
    if (!canManage(req.user, user)) return res.status(403).json({ message: 'Je mag deze gebruiker niet beheren.' });

    const fields = pick(req.body, ['name', 'phone', 'active']);
    if (req.user.role === 'admin') Object.assign(fields, pick(req.body, ['role', 'school', 'schools']));
    if (fields.role === 'admin') { fields.school = null; fields.schools = []; }
    if (fields.role === 'consultant') fields.school = null;
    if (fields.role === 'client') fields.schools = [];
    if (String(user._id) === String(req.user._id) && fields.active === false) {
      return res.status(400).json({ message: 'Je kan jezelf niet deactiveren.' });
    }
    user.set(fields);
    if (req.body.password) {
      if (req.body.password.length < 8) return res.status(400).json({ message: 'Het wachtwoord moet minstens 8 tekens hebben.' });
      user.password = req.body.password;
    }
    await user.save();
    res.json(user.toSafeObject());
  } catch (err) {
    res.status(400).json({ message: 'Kon gebruiker niet bijwerken.', error: err.message });
  }
});

// DELETE /api/users/:id  (admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: 'Je kan jezelf niet verwijderen.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Gebruiker niet gevonden.' });
    await user.deleteOne();
    res.json({ message: 'Gebruiker verwijderd.' });
  } catch (err) {
    res.status(400).json({ message: 'Kon gebruiker niet verwijderen.', error: err.message });
  }
});

module.exports = router;
