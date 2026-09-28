// School year runs September -> August. 'juli' covers July-August.
const MONTHS = ['september', 'oktober', 'november', 'december', 'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli'];
const PLAN_MONTHS = [...MONTHS, 'augustus'];

const ANSWER_TYPES = ['number', 'percentage', 'scale10', 'inschaling', 'text'];
const STATUSES = ['monitoren', 'ok', 'actie'];
const ROLES = ['admin', 'consultant', 'client'];

const monthIndex = (m) => {
  const i = PLAN_MONTHS.indexOf(m);
  return i === -1 ? 99 : i;
};

const SCHOOL_YEAR_RE = /^\d{4}-\d{4}$/;

module.exports = { MONTHS, PLAN_MONTHS, ANSWER_TYPES, STATUSES, ROLES, monthIndex, SCHOOL_YEAR_RE };
