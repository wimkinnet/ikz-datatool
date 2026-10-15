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

// Chart colours (validated: chroma floor and CVD separation pass; red/green always ship with labels + legend)
export const CHART = { groen: '#23875a', aandacht: '#b8892b', rood: '#b3432b', none: '#c8c3b8', accent: '#3f6659' };

// The active meetpunten under a goal's beoogde resultaten (each counted once)
export function goalMeetpunten(goal, meetpunten) {
  const ids = new Set(goal.results.map(String));
  return meetpunten.filter((m) => m.active && ids.has(String(m.result)));
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
