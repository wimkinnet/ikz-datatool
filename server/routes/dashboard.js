const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { schoolScope } = require('../middleware/access');
const { PLAN_MONTHS, SCHOOL_YEAR_RE } = require('../utils/constants');
const { loadPlan } = require('../utils/plan');
const { computeProgress } = require('../utils/progress');

router.use(protect, schoolScope);

const tally = (arr) => {
  const m = new Map();
  arr.filter(Boolean).forEach((k) => m.set(k, (m.get(k) || 0) + 1));
  return [...m.entries()].map(([key, count]) => ({ key, count }));
};

// GET /api/dashboard?school=&year=   -> the data behind the four charts of the Excel dashboard + progress
router.get('/', async (req, res) => {
  try {
    const year = req.query.year;
    if (!SCHOOL_YEAR_RE.test(year || '')) return res.status(400).json({ message: 'Ongeldig schooljaar.' });

    const [plan, progress] = await Promise.all([loadPlan(req.schoolId, year), computeProgress(req.schoolId, year)]);

    const byStatus = { monitoren: 0, ok: 0, actie: 0 };
    plan.forEach((p) => { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });

    // "Aantal taken per maand" (stacked by status) - only months that occur in the plan or the school year
    const perMonth = PLAN_MONTHS.map((month) => {
      const rows = plan.filter((p) => p.month === month);
      return {
        month,
        monitoren: rows.filter((r) => r.status === 'monitoren').length,
        ok: rows.filter((r) => r.status === 'ok').length,
        actie: rows.filter((r) => r.status === 'actie').length,
      };
    }).filter((m) => m.month !== 'augustus' || m.monitoren + m.ok + m.actie > 0);

    // "Verdeling taken per ROK" counts a task under both of its ROK domains
    const perRok = tally(plan.flatMap((p) => [p.rok1, p.rok2])).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
    const perInschaling = tally(plan.map((p) => p.inschaling));
    const perSchaal = tally(plan.map((p) => p.schaal));

    res.json({
      totals: { tasks: plan.length, ...byStatus, percentOk: plan.length ? Math.round((byStatus.ok / plan.length) * 100) : 0 },
      perMonth,
      perRok,
      perInschaling,
      perSchaal,
      actions: plan
        .filter((p) => p.status === 'actie')
        .slice(0, 10)
        .map((p) => ({ _id: p._id, month: p.month, theme: p.theme, action: p.action, threshold: p.threshold })),
      progress,
    });
  } catch (err) {
    res.status(500).json({ message: 'Kon dashboard niet laden.', error: err.message });
  }
});

module.exports = router;
