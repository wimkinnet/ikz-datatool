const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Niet aangemeld. Log opnieuw in.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Account niet gevonden of gedeactiveerd.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Sessie verlopen of ongeldig. Log opnieuw in.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Je hebt hier geen toegang toe.' });
    }
    next();
  };
}

// Admins and consultants (everyone except school users)
const requireStaff = requireRole('admin', 'consultant');

module.exports = { protect, requireRole, requireStaff };
