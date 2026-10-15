// School year runs September -> August.
const PLAN_MONTHS = ['september', 'oktober', 'november', 'december', 'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus'];
const ROLES = ['admin', 'consultant', 'client'];
const SCHOOL_YEAR_RE = /^\d{4}-\d{4}$/;

module.exports = { PLAN_MONTHS, ROLES, SCHOOL_YEAR_RE };
