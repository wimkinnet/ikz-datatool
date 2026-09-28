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
