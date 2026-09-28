const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');
const { canAccessSchool, schoolScope } = require('../middleware/access');
const { upload, UPLOAD_ROOT } = require('../middleware/upload');
const { SCHOOL_YEAR_RE } = require('../utils/constants');

router.use(protect);

const filePathFor = (doc) => path.join(UPLOAD_ROOT, String(doc.school), doc.storedFileName);

// GET /api/documents?school=&year=&questionKey=&category=
router.get('/', schoolScope, async (req, res) => {
  try {
    const filter = { school: req.schoolId };
    if (req.query.year) filter.schoolYear = req.query.year;
    if (req.query.questionKey) filter.questionKey = req.query.questionKey;
    if (req.query.category) filter.category = req.query.category;
    const docs = await Document.find(filter).populate('uploadedBy', 'name role').sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Kon documenten niet laden.', error: err.message });
  }
});

// POST /api/documents  multipart: school (first!), schoolYear, category, questionKey, notes, file
router.post('/', upload.single('file'), async (req, res) => {
  const discard = () => { if (req.file) fs.unlink(req.file.path, () => {}); };
  try {
    if (!req.file) return res.status(400).json({ message: 'Er is geen bestand meegestuurd.' });
    const schoolId = req.user.role === 'client' ? String(req.user.school) : req.body.school;
    if (!canAccessSchool(req.user, schoolId)) { discard(); return res.status(403).json({ message: 'Je hebt geen toegang tot deze school.' }); }
    const schoolYear = req.body.schoolYear || '';
    if (schoolYear && !SCHOOL_YEAR_RE.test(schoolYear)) { discard(); return res.status(400).json({ message: 'Ongeldig schooljaar.' }); }

    const category = ['bijlage', 'rapport', 'overig'].includes(req.body.category) ? req.body.category : req.body.questionKey ? 'bijlage' : 'overig';
    const doc = await Document.create({
      school: schoolId,
      schoolYear,
      category,
      questionKey: req.body.questionKey || '',
      originalName: req.file.originalname,
      storedFileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      notes: req.body.notes,
      uploadedBy: req.user._id,
    });
    res.status(201).json(doc);
  } catch (err) {
    discard();
    res.status(400).json({ message: 'Uploaden mislukt.', error: err.message });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document niet gevonden.' });
    if (!canAccessSchool(req.user, doc.school)) return res.status(403).json({ message: 'Je hebt geen toegang tot dit document.' });
    const fp = filePathFor(doc);
    if (!fs.existsSync(fp)) return res.status(404).json({ message: 'Het bestand ontbreekt in de opslag.' });
    res.download(fp, doc.originalName);
  } catch (err) {
    res.status(500).json({ message: 'Kon bestand niet downloaden.', error: err.message });
  }
});

// Consultants/admins (with access) may delete any file of their school; school users only their own uploads
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document niet gevonden.' });
    if (!canAccessSchool(req.user, doc.school)) return res.status(403).json({ message: 'Je hebt geen toegang tot dit document.' });
    const isOwn = doc.uploadedBy && String(doc.uploadedBy) === String(req.user._id);
    if (req.user.role === 'client' && !isOwn) return res.status(403).json({ message: 'Je kan enkel bestanden verwijderen die je zelf uploadde.' });
    fs.unlink(filePathFor(doc), () => {});
    await doc.deleteOne();
    res.json({ message: 'Document verwijderd.' });
  } catch (err) {
    res.status(400).json({ message: 'Kon document niet verwijderen.', error: err.message });
  }
});

module.exports = router;
