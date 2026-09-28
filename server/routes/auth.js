const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Te veel aanmeldpogingen. Probeer het over 15 minuten opnieuw.' },
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'E-mailadres en wachtwoord zijn verplicht.' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !user.active || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Ongeldig e-mailadres of wachtwoord.' });
    }
    res.json({ token: generateToken(user._id), user: user.toSafeObject() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Aanmelden mislukt.', error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ user: req.user.toSafeObject() }));

// PUT /api/auth/me  - change own name/phone, or password (requires the current password)
router.put('/me', protect, async (req, res) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (newPassword) {
      if (newPassword.length < 8) return res.status(400).json({ message: 'Het nieuwe wachtwoord moet minstens 8 tekens hebben.' });
      if (!currentPassword || !(await user.comparePassword(currentPassword))) {
        return res.status(400).json({ message: 'Huidig wachtwoord is niet correct.' });
      }
      user.password = newPassword;
    }
    await user.save();
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(400).json({ message: 'Bijwerken mislukt.', error: err.message });
  }
});

module.exports = router;
