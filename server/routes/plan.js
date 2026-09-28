const express = require('express');
const router = express.Router();
const PlanItem = require('../models/PlanItem');
const School = require('../models/School');
const { protect, requireStaff } = require('../middleware/auth');
const { canAccessSchool, schoolScope } = require('../middleware/access');
const { PLAN_MONTHS, STATUSES, SCHOOL_YEAR_RE } = require('../utils/constants');
const { loadPlan } = require('../utils/plan');
const pick = require('../utils/pick');

router.use(protect);

// Fields that define the structure of the plan (who/what/when) vs. the fields schools update as they go
const STRUCTURE_FIELDS = ['month', 'theme', 'threshold', 'rok1', 'rok2', 'schaal', 'onderdeel', 'source', 'order', 'questionKey', 'thresholdValue', 'thresholdDirection', 'statusMode'];
const PROGRESS_FIELDS = ['status', 'inschaling', 'extraInfo', 'action'];

// ?school=template targets the default plan (admin only); otherwise normal school scoping applies
function planScope(req, res, next) {
  const wantsTemplate = req.query.school === 'template' || (req.body && req.body.school === 'template');
  if (wantsTemplate) {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Alleen admins beheren het standaard jaarplan.' });
    req.isTemplate = true;
    return next();
  }
  return schoolScope(req, res, next);
}

async function canEditStructure(user, schoolId) {
  if (user.role !== 'client') return true;
  const school = await School.findById(schoolId).select('clientCanEditPlanStructure');
  return !!(school && school.clientCanEditPlanStructure);
}

function validate(fields) {
  if (fields.month !== undefined && !PLAN_MONTHS.includes(fields.month)) throw new Error('Ongeldige maand.');
  if (fields.status !== undefined && !STATUSES.includes(fields.status)) throw new Error('Ongeldige status.');
  if (fields.thresholdValue === '') fields.thresholdValue = null;
  if (fields.thresholdValue !== undefined && fields.thresholdValue !== null) {
    fields.thresholdValue = Number(String(fields.thresholdValue).replace(',', '.'));
    if (!Number.isFinite(fields.thresholdValue)) throw new Error('De drempelwaarde (getal) is ongeldig.');
  }
}

// GET /api/plan?school=&year=2026-2027   (or school=template)
router.get('/', planScope, async (req, res) => {
  try {
    if (req.isTemplate) {
      const items = await PlanItem.find({ school: null }).lean();
      items.sort((a, b) => PLAN_MONTHS.indexOf(a.month) - PLAN_MONTHS.indexOf(b.month) || a.order - b.order);
      return res.json(items);
    }
    if (!SCHOOL_YEAR_RE.test(req.query.year || '')) return res.status(400).json({ message: 'Ongeldig schooljaar.' });
    res.json(await loadPlan(req.schoolId, req.query.year));
  } catch (err) {
    res.status(500).json({ message: 'Kon jaarplan niet laden.', error: err.message });
  }
});

// POST /api/plan  { school|'template', schoolYear, ...fields }
router.post('/', planScope, async (req, res) => {
  try {
    if (!req.isTemplate) {
      if (!SCHOOL_YEAR_RE.test(req.body.schoolYear || '')) return res.status(400).json({ message: 'Ongeldig schooljaar.' });
      if (!(await canEditStructure(req.user, req.schoolId))) return res.status(403).json({ message: 'Alleen je consultant kan taken toevoegen aan het jaarplan.' });
    }
    const fields = pick(req.body, [...STRUCTURE_FIELDS, ...PROGRESS_FIELDS]);
    validate(fields);
    const item = await PlanItem.create({
      ...fields,
      school: req.isTemplate ? null : req.schoolId,
      schoolYear: req.isTemplate ? null : req.body.schoolYear,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Kon taak niet aanmaken.' });
  }
});

// Loads an item and works out what the current user may do with it
async function loadAuthorized(req, res) {
  const item = await PlanItem.findById(req.params.id);
  if (!item) { res.status(404).json({ message: 'Taak niet gevonden.' }); return null; }
  if (item.school === null) {
    if (req.user.role !== 'admin') { res.status(403).json({ message: 'Alleen admins beheren het standaard jaarplan.' }); return null; }
    return { item, structure: true };
  }
  if (!canAccessSchool(req.user, item.school)) { res.status(403).json({ message: 'Je hebt geen toegang tot deze school.' }); return null; }
  return { item, structure: await canEditStructure(req.user, item.school) };
}

router.put('/:id', async (req, res) => {
  try {
    const ctx = await loadAuthorized(req, res);
    if (!ctx) return;
    const fields = pick(req.body, ctx.structure ? [...STRUCTURE_FIELDS, ...PROGRESS_FIELDS] : PROGRESS_FIELDS);
    validate(fields);
    ctx.item.set(fields);
    await ctx.item.save();
    res.json(ctx.item);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Kon taak niet bijwerken.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ctx = await loadAuthorized(req, res);
    if (!ctx) return;
    if (!ctx.structure) return res.status(403).json({ message: 'Alleen je consultant kan taken verwijderen.' });
    await ctx.item.deleteOne();
    res.json({ message: 'Taak verwijderd.' });
  } catch (err) {
    res.status(400).json({ message: 'Kon taak niet verwijderen.', error: err.message });
  }
});

// POST /api/plan/apply-template  { school, schoolYear, replace? }  - copy the default plan into a school year
router.post('/apply-template', requireStaff, schoolScope, async (req, res) => {
  try {
    const { schoolYear, replace } = req.body;
    if (!SCHOOL_YEAR_RE.test(schoolYear || '')) return res.status(400).json({ message: 'Ongeldig schooljaar.' });

    const existing = await PlanItem.countDocuments({ school: req.schoolId, schoolYear });
    if (existing && !replace) {
      return res.status(409).json({ message: `Er staan al ${existing} taken in dit jaarplan. Kies "vervangen" om opnieuw te starten vanaf het standaardplan.` });
    }
    if (existing) await PlanItem.deleteMany({ school: req.schoolId, schoolYear });

    const template = await PlanItem.find({ school: null }).lean();
    const copies = template.map(({ _id, createdAt, updatedAt, __v, ...rest }) => ({ ...rest, status: 'monitoren', school: req.schoolId, schoolYear }));
    await PlanItem.insertMany(copies);
    res.status(201).json({ created: copies.length });
  } catch (err) {
    res.status(400).json({ message: 'Kon standaardplan niet toepassen.', error: err.message });
  }
});

module.exports = router;
