const express = require('express');
const router = express.Router();
const User = require('../models/User');
const School = require('../models/School');
const { protect, requireRole, requireStaff } = require('../middleware/auth');
const { schoolIdsOf, canAccessSchool } = require('../middleware/access');
const pick = require('../utils/pick');

router.use(protect, requireStaff);

// A consultant may only manage school users (role=client) whose schools are all among their own schools.
function canManage(actor, target) {
  if (actor.role === 'admin') return true;
  const ids = schoolIdsOf(target);
  return target.role === 'client' && ids.length > 0 && ids.every((id) => canAccessSchool(actor, id));
}

// School list sent by the client form (accepts the old single `school` field too)
function requestedSchools(body) {
  const list = Array.isArray(body.schools) ? body.schools : body.school ? [body.school] : [];
  return [...new Set(list.map(String))];
}

// GET /api/users
router.get('/', async (req, res) => {
  try {
    // Consultants see the school users that share at least one of their schools
    const mine = schoolIdsOf(req.user);
    const filter = req.user.role === 'admin' ? {} : { role: 'client', $or: [{ schools: { $in: mine } }, { school: { $in: mine } }] };
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
    let { role, schools } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Naam, e-mailadres en wachtwoord zijn verplicht.' });
    if (password.length < 8) return res.status(400).json({ message: 'Het wachtwoord moet minstens 8 tekens hebben.' });

    if (req.user.role !== 'admin') role = 'client'; // consultants can only invite school users
    if (!['admin', 'consultant', 'client'].includes(role)) role = 'client';

    if (role === 'client') {
      schools = requestedSchools(req.body);
      const invalid = !schools.length || schools.some((id) => !canAccessSchool(req.user, id));
      if (invalid || (await School.countDocuments({ _id: { $in: schools } })) !== schools.length) {
        return res.status(400).json({ message: 'Kies minstens één school (waartoe je toegang hebt) voor dit schoolaccount.' });
      }
    } else if (role === 'admin') {
      schools = [];
    }

    if (await User.findOne({ email: String(email).toLowerCase().trim() })) {
      return res.status(409).json({ message: 'Er bestaat al een gebruiker met dit e-mailadres.' });
    }

    const user = await User.create({ name, email, password, phone, role, school: null, schools: schools || [] });
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
    if (req.user.role === 'admin' && ('schools' in req.body || 'school' in req.body)) {
      const role = req.body.role || user.role;
      fields.schools = role === 'admin' ? [] : requestedSchools(req.body);
      fields.school = null; // everyone uses the schools list now
      if (role === 'client' && !fields.schools.length) return res.status(400).json({ message: 'Kies minstens één school voor dit schoolaccount.' });
    }
    if (req.user.role === 'admin' && req.body.role) fields.role = req.body.role;
    if (fields.role === 'admin') { fields.school = null; fields.schools = []; }
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
