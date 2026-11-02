import { currentSchoolYear, PLAN_MONTHS } from '../utils/constants';

// Two separate questions per meetpunt (an indicator or the meetpunt of an action):
//  - invulstatus: has it been filled in? (ingevuld / te laat / nog in te vullen)
//  - resultaat, only once filled in: op niveau / onder niveau / zonder beoordeling
// (stored as beoordeling 'groen' / 'rood' / empty).
export const RESULT_LABEL = { groen: 'Op niveau', rood: 'Onder niveau' };

// Codes as shown: ROK-R1, Sign-P2 (category letter + number per school and category) and Strat-1
const SIGNAL_LETTER = { context: 'C', proces: 'P', resultaten: 'R' };
export const signalCode = (s) => `Sign-${SIGNAL_LETTER[s.category] || '?'}${s.number}`;
export const strategicCode = (s) => `Strat-${s.number}`;
export const rokCode = (code) => `ROK-${code}`;

// Overall assessment of an operational goal from the results of its indicators.
// Share op niveau among the assessed indicators: >= 75% op koers, >= 50% aandacht, otherwise niet op koers.
export const GOAL_RULE = { opKoers: 0.75, aandacht: 0.5 };

export const GOAL_STATUS = {
  ok: { label: 'Op koers', cls: 'ok' },
  aandacht: { label: 'Aandacht', cls: 'monitoren' },
  niet: { label: 'Niet op koers', cls: 'actie' },
  onbekend: { label: 'Nog geen resultaat', cls: 'none' },
  geen: { label: 'Geen indicatoren', cls: 'none' },
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

export const isFilled = (m) => (m.value !== null && m.value !== undefined && m.value !== '') || !!m.beoordeling;

// Invulstatus in the school year of its goal: 'done' | 'late' | 'now' | 'planned'
export function fillState(m, schoolYear) {
  if (isFilled(m)) return 'done';
  const idx = PLAN_MONTHS.findIndex((x) => x.key === m.month);
  const phase = idx === -1 ? 'future' : monthPhase(schoolYear, idx);
  return phase === 'past' ? 'late' : phase === 'now' ? 'now' : 'planned';
}

// Resultaat: 'groen' | 'rood' | 'zonder' (filled in, not assessed) | null (not filled in yet)
export const resultOf = (m) => (isFilled(m) ? m.beoordeling || 'zonder' : null);

// Counts for a list of meetpunten of one school year: invulstatus and resultaat
export function tally(meetpunten, schoolYear) {
  const c = { total: meetpunten.length, done: 0, late: 0, now: 0, planned: 0, groen: 0, rood: 0, zonder: 0 };
  for (const m of meetpunten) {
    c[fillState(m, schoolYear)]++;
    const r = resultOf(m);
    if (r) c[r]++;
  }
  return c;
}

// A goal's domeinen follow from its signals
export const goalSignals = (goal, signals) => signals.filter((s) => (goal.signals || []).includes(s._id));
export const goalDomains = (goal, signals) => [...new Set(goalSignals(goal, signals).map((s) => String(s.domain)))];

export function assessGoal(goal, t) {
  const c = tally(t.indicatorsOf(goal._id), goal.schoolYear);
  const { groen, rood, total } = c;
  const measured = groen + rood;
  const ratio = measured ? groen / measured : null;
  let key = 'geen';
  if (total) key = !measured ? 'onbekend' : ratio >= GOAL_RULE.opKoers ? 'ok' : ratio >= GOAL_RULE.aandacht ? 'aandacht' : 'niet';
  return { key, ...GOAL_STATUS[key], ...c, measured, ratio, provisional: measured > 0 && measured < total };
}
