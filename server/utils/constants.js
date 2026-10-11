// School year runs September -> August. 'juli' covers July-August.
const MONTHS = ['september', 'oktober', 'november', 'december', 'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli'];
const PLAN_MONTHS = [...MONTHS, 'augustus'];

const ANSWER_TYPES = ['number', 'percentage', 'scale10', 'inschaling', 'text'];
const STATUSES = ['monitoren', 'ok', 'actie'];
const ROLES = ['admin', 'consultant', 'client'];

// Highest-level split of the tool: every school is either basisonderwijs (BO) or secundair onderwijs (SO).
// The questionnaire, year plan, dashboard and trends are built for BO; the SO context comes later.
const SECTORS = ['BO', 'SO'];

const monthIndex = (m) => {
  const i = PLAN_MONTHS.indexOf(m);
  return i === -1 ? 99 : i;
};

const SCHOOL_YEAR_RE = /^\d{4}-\d{4}$/;

module.exports = { MONTHS, PLAN_MONTHS, ANSWER_TYPES, STATUSES, ROLES, SECTORS, monthIndex, SCHOOL_YEAR_RE };
