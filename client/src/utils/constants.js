export const MONTHS = [
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
  { key: 'juli', label: 'Juli-augustus' },
];
export const PLAN_MONTHS = [...MONTHS, { key: 'augustus', label: 'Augustus' }];
export const monthLabel = (key) => PLAN_MONTHS.find((m) => m.key === key)?.label || key;
export const monthIdx = (key) => {
  const i = PLAN_MONTHS.findIndex((m) => m.key === key);
  return i === -1 ? 99 : i;
};

export const STATUS = {
  monitoren: { label: 'Monitoren', long: 'Monitoren, tegen drempelwaarde', color: '#b8892b' },
  ok: { label: 'Ok', long: 'Ok, boven drempelwaarde', color: '#2f7d55' },
  actie: { label: 'Actie nodig', long: 'Actie ondernemen, onder drempelwaarde', color: '#b3432b' },
};
export const STATUS_KEYS = ['monitoren', 'ok', 'actie'];

// Colours for the 4 inschaling levels (beneden -> overtreft de verwachting)
export const INSCHALING_COLORS = ['#b3432b', '#d59a3a', '#5f9c78', '#2c6b58'];

export const ANSWER_TYPES = [
  { key: 'number', label: 'Aantal (getal)' },
  { key: 'percentage', label: 'Percentage (0-100)' },
  { key: 'scale10', label: 'Score op 10' },
  { key: 'inschaling', label: 'Inschaling (t.o.v. verwachting)' },
  { key: 'text', label: 'Tekst / analyse' },
];
export const NUMERIC_TYPES = ['number', 'percentage', 'scale10'];

// Highest-level split of the tool. BO has the questionnaire, year plan, dashboard and trends; SO comes later.
export const SECTORS = [
  { key: 'BO', label: 'Basisonderwijs', short: 'BO' },
  { key: 'SO', label: 'Secundair onderwijs', short: 'SO' },
];
// Test is not a school type but an experimental workspace (admins only) that works on every school
export const TEST_SECTOR = { key: 'TEST', label: 'Test', short: 'Test' };
export const SWITCH_OPTIONS = [...SECTORS, TEST_SECTOR];
export const sectorLabel = (key) => SWITCH_OPTIONS.find((s) => s.key === key)?.label || key;

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

// SO (Kwaliteitsmonitor): the source tabs of the workbook and the three-step inschaling
export const SO_SOURCES = [
  { key: 'smartschool', label: 'Smartschool' },
  { key: 'datawijzer', label: 'Datawijzer' },
  { key: 'dataloep', label: 'Dataloep' },
  { key: 'andere', label: 'Andere' },
  { key: 'vakwerkgroepen', label: 'Vakwerkgroepen' },
  { key: 'llnbgl', label: 'Llnbgl & GOK' },
];
export const soSourceLabel = (key) => SO_SOURCES.find((s) => s.key === key)?.label || key;
// value -> label + the BO status colour class it reuses
export const INSCHALING_SO = [
  { value: 1, label: 'Op niveau', cls: 'ok' },
  { value: 0, label: 'Opvolgen', cls: 'monitoren' },
  { value: -1, label: 'Actie nodig', cls: 'actie' },
];
export const inschalingSO = (v) => INSCHALING_SO.find((i) => i.value === v) || null;

// Test: operationele doelen -> beoogde resultaten -> meetpunten -> metingen -> acties
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
