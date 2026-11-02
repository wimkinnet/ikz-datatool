import { currentSchoolYear, PLAN_MONTHS } from '../utils/constants';

// Two separate questions per meetpunt and school year:
//  - invulstatus: has it been filled in? (ingevuld / achterstallig / nog in te vullen)
//  - resultaat, only once filled in: op niveau / onder niveau / zonder beoordeling
// (stored as beoordeling 'groen' / 'rood' / empty).
export const RESULT_LABEL = { groen: 'Op niveau', rood: 'Onder niveau' };

// Overall assessment of an operational goal from the results of its meetpunten in one school year.
// Share op niveau among the assessed meetpunten: >= 75% op koers, >= 50% aandacht, otherwise niet op koers.
export const GOAL_RULE = { opKoers: 0.75, aandacht: 0.5 };

export const GOAL_STATUS = {
  ok: { label: 'Op koers', cls: 'ok' },
  aandacht: { label: 'Aandacht', cls: 'monitoren' },
  niet: { label: 'Niet op koers', cls: 'actie' },
  onbekend: { label: 'Nog geen resultaat', cls: 'none' },
  geen: { label: 'Geen meetpunten', cls: 'none' },
};

// Chart colours (validated: chroma floor and CVD separation pass; results always ship with labels + legend).
// Stacks put 'zonder beoordeling' between op niveau and onder niveau, which keeps red and green apart.
export const CHART = { groen: '#23875a', aandacht: '#b8892b', rood: '#b3432b', none: '#c3cdcd', accent: 'var(--chart-accent)', ingevuld: '#2f6fb0' };

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

// Invulstatus: 'done' | 'late' | 'now' | 'planned'. A meetpunt without an evaluation month is never overdue.
export function fillState(m, mt, schoolYear) {
  if (isFilled(mt)) return 'done';
  const idx = PLAN_MONTHS.findIndex((x) => x.key === m.month);
  const phase = idx === -1 ? 'future' : monthPhase(schoolYear, idx);
  return phase === 'past' ? 'late' : phase === 'now' ? 'now' : 'planned';
}

// Resultaat: 'groen' | 'rood' | 'zonder' (filled in, not assessed) | null (not filled in yet)
export const resultOf = (mt) => (isFilled(mt) ? mt.beoordeling || 'zonder' : null);

// Counts for a list of meetpunten: invulstatus (done, late, now, planned) and resultaat (groen, rood, zonder)
export function tally(meetpunten, t, schoolYear) {
  const c = { total: meetpunten.length, done: 0, late: 0, now: 0, planned: 0, groen: 0, rood: 0, zonder: 0 };
  for (const m of meetpunten) {
    const mt = t.metingOf(m._id, schoolYear);
    c[fillState(m, mt, schoolYear)]++;
    const r = resultOf(mt);
    if (r) c[r]++;
  }
  return c;
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
  const c = tally(mps, t, schoolYear);
  const { groen, rood } = c;
  const measured = groen + rood;
  const ratio = measured ? groen / measured : null;
  let key = 'geen';
  if (mps.length) key = !measured ? 'onbekend' : ratio >= GOAL_RULE.opKoers ? 'ok' : ratio >= GOAL_RULE.aandacht ? 'aandacht' : 'niet';
  return { key, ...GOAL_STATUS[key], ...c, measured, ratio, provisional: measured > 0 && measured < mps.length };
}
