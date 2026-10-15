// School year: September -> August
export const PLAN_MONTHS = [
  { key: 'september', label: 'September' },
  { key: 'oktober', label: 'Oktober' },
  { key: 'november', label: 'November' },
  { key: 'december', label: 'December' },
  { key: 'januari', label: 'Januari' },
  { key: 'februari', label: 'Februari' },
  { key: 'maart', label: 'Maart' },
  { key: 'april', label: 'April' },
  { key: 'mei', label: 'Mei' },
  { key: 'juni', label: 'Juni' },
  { key: 'juli', label: 'Juli' },
  { key: 'augustus', label: 'Augustus' },
];
export const monthLabel = (key) => PLAN_MONTHS.find((m) => m.key === key)?.label || key;

export const ROLE_LABELS = { admin: 'Admin', consultant: 'Consultant', client: 'School' };

// Belgian school year: September -> August
export function currentSchoolYear(date = new Date()) {
  const y = date.getFullYear();
  return date.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
export function shiftYear(schoolYear, n) {
  const start = parseInt(schoolYear.slice(0, 4), 10) + n;
  return `${start}-${start + 1}`;
}
export function yearOptions() {
  const cur = currentSchoolYear();
  return [-4, -3, -2, -1, 0, 1].map((n) => shiftYear(cur, n));
}

// The quality model: operationele doelen -> domeinen -> meetpunten -> metingen -> acties
export const TEST_CATEGORIES = [
  { key: 'proces', label: 'Proces' },
  { key: 'resultaten', label: 'Resultaten' },
  { key: 'context', label: 'Context' },
];
export const testCategoryLabel = (key) => TEST_CATEGORIES.find((c) => c.key === key)?.label || key;
export const TEST_VALUE_TYPES = [
  { key: 'percentage', label: 'Percentage' },
  { key: 'absoluut', label: 'Absoluut getal' },
  { key: 'tekst', label: 'Vrije tekst' },
];
export const TEST_ACTION_STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'bezig', label: 'Bezig' },
  { key: 'afgerond', label: 'Afgerond' },
];
export const FIRST_GOAL_YEAR = '2026-2027';
export const FIRST_MEASURE_YEAR = '2024-2025';
// School years from `from` up to and including `to` ('2024-2025', '2025-2026', …)
export function yearsBetween(from, to) {
  const out = [];
  for (let y = from; y <= to && out.length < 20; y = shiftYear(y, 1)) out.push(y);
  return out;
}
