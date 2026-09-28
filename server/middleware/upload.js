const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// Which school folder a file goes into is decided here from the logged-in user / validated ObjectId,
// never from a raw client-supplied path. (Access to that school is re-checked in the route.)
function schoolFolderFor(req) {
  const raw = req.user.role === 'client' ? String(req.user.school || '') : String((req.body && req.body.school) || '');
  return mongoose.isValidObjectId(raw) ? raw : null;
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = schoolFolderFor(req);
    if (!folder) return cb(Object.assign(new Error('Geen geldige school opgegeven (stuur het veld "school" vóór het bestand mee).'), { status: 400 }));
    const dir = path.join(UPLOAD_ROOT, folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${base}${ext}`);
  },
});

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
]);

const upload = multer({
  storage,
  fileFilter(req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Bestandstype niet toegestaan. Toegestaan: PDF, Word, Excel, PowerPoint, CSV, PNG, JPG.'), { status: 400 }));
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});

module.exports = { upload, UPLOAD_ROOT };
