// School year runs September -> August.
const PLAN_MONTHS = ['september', 'oktober', 'november', 'december', 'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus'];
const ROLES = ['admin', 'consultant', 'client'];
const THEMES = ['bespreek', 'catalista']; // the look of the tool, per user
const SCHOOL_YEAR_RE = /^\d{4}-\d{4}$/;

module.exports = { PLAN_MONTHS, ROLES, THEMES, SCHOOL_YEAR_RE };
