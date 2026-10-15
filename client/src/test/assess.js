import { currentSchoolYear } from '../utils/constants';

// Overall assessment of an operational goal from the red/green verdicts of its meetpunten in one school year.
// Share of green among the meetpunten that were assessed: >= 75% op koers, >= 50% aandacht, otherwise niet op koers.
export const GOAL_RULE = { opKoers: 0.75, aandacht: 0.5 };

export const GOAL_STATUS = {
  ok: { label: 'Op koers', cls: 'ok' },
  aandacht: { label: 'Aandacht', cls: 'monitoren' },
  niet: { label: 'Niet op koers', cls: 'actie' },
  onbekend: { label: 'Nog niet gemeten', cls: 'none' },
  geen: { label: 'Geen meetpunten', cls: 'none' },
};

// Chart colours (validated: chroma floor and CVD separation pass; red/green always ship with labels + legend).
// For the month chart the stack order groen, ingevuld, rood, achterstallig, open keeps red and green apart.
export const CHART = { groen: '#23875a', aandacht: '#b8892b', rood: '#b3432b', none: '#c3cdcd', accent: '#009089', ingevuld: '#2f6fb0' };

// Index (0 = september … 11 = augustus) of today's month
export const todayMonthIdx = () => (new Date().getMonth() + 4) % 12;

// Where month `idx` of `schoolYear` stands relative to today: 'past', 'now' or 'future'
export function monthPhase(schoolYear, idx) {
  const cur = currentSchoolYear();
  if (schoolYear < cur) return 'past';
  if (schoolYear > cur) return 'future';
  return idx < todayMonthIdx() ? 'past' : idx === todayMonthIdx() ? 'now' : 'future';
}

export const isFilled = (mt) => !!mt && ((mt.value !== null && mt.value !== '') || !!mt.beoordeling);

// State of one meetpunt in a month: 'groen' | 'rood' | 'ingevuld' (no verdict) | 'late' | 'now' | 'planned'
export function meetpuntState(mt, phase) {
  if (isFilled(mt)) return mt.beoordeling || 'ingevuld';
  return phase === 'past' ? 'late' : phase === 'now' ? 'now' : 'planned';
}

// A meetpunt can belong to several beoogde resultaten
export const resultsOf = (m) => (m.results || []).map(String);
export const inResult = (m, resultId) => resultsOf(m).includes(String(resultId));
export const resultNames = (m, resultById) => resultsOf(m).map((id) => resultById[id]?.name).filter(Boolean).join(', ');

// The active meetpunten under a goal's beoogde resultaten (each counted once, also when it serves several)
export function goalMeetpunten(goal, meetpunten) {
  const ids = new Set(goal.results.map(String));
  return meetpunten.filter((m) => m.active && resultsOf(m).some((id) => ids.has(id)));
}

export function assessGoal(goal, t, schoolYear) {
  const mps = goalMeetpunten(goal, t.meetpunten);
  const verdicts = mps.map((m) => t.metingOf(m._id, schoolYear)?.beoordeling || null);
  const groen = verdicts.filter((v) => v === 'groen').length;
  const rood = verdicts.filter((v) => v === 'rood').length;
  const measured = groen + rood;
  const ratio = measured ? groen / measured : null;
  let key = 'geen';
  if (mps.length) key = !measured ? 'onbekend' : ratio >= GOAL_RULE.opKoers ? 'ok' : ratio >= GOAL_RULE.aandacht ? 'aandacht' : 'niet';
  return { key, ...GOAL_STATUS[key], total: mps.length, measured, groen, rood, open: mps.length - measured, ratio, provisional: measured > 0 && measured < mps.length };
}
