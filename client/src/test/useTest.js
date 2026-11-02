import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { FIRST_GOAL_YEAR, PLAN_MONTHS } from '../utils/constants';

// Loads the quality model of the active school: the shared lists (domeinen, ROK), its signals and strategic goals, all
// its goals with their indicators and actions, and which of those belong to the active school year.
// `reload` refetches the school data after a change.
export function useTest() {
  const { schoolId, year } = useApp();
  const [results, setResults] = useState([]);
  const [rok, setRok] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [signals, setSignals] = useState([]);
  const [strategic, setStrategic] = useState([]);
  const [meetpunten, setMeetpunten] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/test/results'), api.get('/rok')])
      .then(([r, k]) => { setResults(r.data); setRok(k.data); })
      .catch((e) => setError(errMsg(e, 'Kon de domeinen niet laden.')));
  }, []);

  const reload = useCallback(async () => {
    if (!schoolId) return;
    const params = { school: schoolId };
    try {
      const [mp, ac, ag, sg, st] = await Promise.all([
        api.get('/test/meetpunten', { params }),
        api.get('/test/actions', { params }),
        api.get('/test/goals', { params: { ...params, all: 1 } }),
        api.get('/test/signals', { params }),
        api.get('/test/strategic', { params }),
      ]);
      setMeetpunten(mp.data); setActions(ac.data); setAllGoals(ag.data); setSignals(sg.data); setStrategic(st.data);
    } catch (e) {
      setError(errMsg(e, 'Kon de gegevens van deze school niet laden.'));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { setLoading(true); reload(); }, [reload]);

  const resultById = useMemo(() => Object.fromEntries(results.map((r) => [r._id, r])), [results]);
  const rokByCode = useMemo(() => Object.fromEntries(rok.map((r) => [r.code, r])), [rok]);
  const goalById = useMemo(() => Object.fromEntries(allGoals.map((g) => [g._id, g])), [allGoals]);
  const goals = useMemo(() => (year >= FIRST_GOAL_YEAR ? allGoals.filter((g) => g.schoolYear === year) : []), [allGoals, year]);

  // In the order of the school year
  const monthOrder = (m) => PLAN_MONTHS.findIndex((x) => x.key === m.month);
  const indicatorsOf = useCallback((goalId) => meetpunten.filter((m) => m.kind === 'indicator' && m.goal === goalId).sort((a, b) => monthOrder(a) - monthOrder(b)), [meetpunten]);
  const actionsOf = useCallback((goalId) => actions.filter((a) => a.goal === goalId), [actions]);
  const meetpuntOfAction = useCallback((actionId) => meetpunten.find((m) => m.kind === 'actie' && m.action === actionId) || null, [meetpunten]);

  // What belongs to the active school year
  const yearActions = useMemo(() => actions.filter((a) => goalById[a.goal]?.schoolYear === year), [actions, goalById, year]);
  const yearMeetpunten = useMemo(() => meetpunten.filter((m) => goalById[m.goal]?.schoolYear === year), [meetpunten, goalById, year]);

  // Runs an API call, shows its error and refreshes the school data; returns true when it worked
  const run = useCallback(async (fn) => {
    setError('');
    try { await fn(); await reload(); return true; } catch (e) { setError(errMsg(e, 'Opslaan mislukt.')); return false; }
  }, [reload]);

  return {
    schoolId, year, loading, error, setError, run, reload,
    results, resultById, rok, rokByCode, goals, allGoals, goalById, signals, strategic,
    meetpunten, actions, indicatorsOf, actionsOf, meetpuntOfAction, yearActions, yearMeetpunten,
  };
}
