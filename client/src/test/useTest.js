import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { FIRST_GOAL_YEAR } from '../utils/constants';

// Loads everything of the Test model for the active school: the shared library (beoogde resultaten, ROK),
// the school's meetpunten, all its metingen (every year from 2024-2025), its actions, and the
// operational goals of the active school year. `reload` refetches the school data after a change.
export function useTest() {
  const { schoolId, year } = useApp();
  const [results, setResults] = useState([]);
  const [rok, setRok] = useState([]);
  const [goals, setGoals] = useState([]);
  const [meetpunten, setMeetpunten] = useState([]);
  const [metingen, setMetingen] = useState([]);
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
      const [mp, mt, ac, gl] = await Promise.all([
        api.get('/test/meetpunten', { params }),
        api.get('/test/metingen', { params }),
        api.get('/test/actions', { params }),
        year >= FIRST_GOAL_YEAR ? api.get('/test/goals', { params: { ...params, year } }) : Promise.resolve({ data: [] }),
      ]);
      setMeetpunten(mp.data); setMetingen(mt.data); setActions(ac.data); setGoals(gl.data);
    } catch (e) {
      setError(errMsg(e, 'Kon de gegevens van deze school niet laden.'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, year]);

  useEffect(() => { setLoading(true); reload(); }, [reload]);

  const resultById = useMemo(() => Object.fromEntries(results.map((r) => [r._id, r])), [results]);
  const rokByCode = useMemo(() => Object.fromEntries(rok.map((r) => [r.code, r])), [rok]);
  const meetpuntById = useMemo(() => Object.fromEntries(meetpunten.map((m) => [m._id, m])), [meetpunten]);
  // meetpunt id -> school year -> meting
  const metingOf = useMemo(() => {
    const map = {};
    for (const m of metingen) (map[m.meetpunt] = map[m.meetpunt] || {})[m.schoolYear] = m;
    return (meetpuntId, schoolYear) => map[meetpuntId]?.[schoolYear] || null;
  }, [metingen]);
  const actionsOf = useCallback((meetpuntId, schoolYear) =>
    actions.filter((a) => a.meetpunt === meetpuntId && (!schoolYear || a.schoolYear === schoolYear)), [actions]);

  // Runs an API call, shows its error and refreshes the school data; returns true when it worked
  const run = useCallback(async (fn) => {
    setError('');
    try { await fn(); await reload(); return true; } catch (e) { setError(errMsg(e, 'Opslaan mislukt.')); return false; }
  }, [reload]);

  return {
    schoolId, year, loading, error, setError, run, reload,
    results, resultById, rok, rokByCode, goals, meetpunten, meetpuntById, metingen, metingOf, actions, actionsOf,
  };
}
