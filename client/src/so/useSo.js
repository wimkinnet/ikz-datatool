import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';

// Loads the SO Kwaliteitsmonitor for the active school and school year: the ROK, the indicators and the
// school's own inschalingen. `rows` merges each indicator with its score (the school's month and threshold
// fall back to the template's). `save` updates one indicator's score in place.
export function useSo() {
  const { schoolId, year } = useApp();
  const [rok, setRok] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [templatesReady, setTemplatesReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/so/rok'), api.get('/so/indicators')])
      .then(([r, i]) => { setRok(r.data); setIndicators(i.data); })
      .catch((e) => setError(errMsg(e, 'Kon de kwaliteitsmonitor niet laden.')))
      .finally(() => setTemplatesReady(true));
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    api.get('/so/scores', { params: { school: schoolId, year } })
      .then((r) => setScores(Object.fromEntries(r.data.map((s) => [s.indicatorKey, s]))))
      .catch((e) => setError(errMsg(e, 'Kon de inschalingen niet laden.')))
      .finally(() => setLoading(false));
  }, [schoolId, year]);

  const rows = useMemo(() => indicators.map((ind) => {
    const s = scores[ind.key] || {};
    return {
      ...ind,
      inschaling: s.inschaling ?? null,
      month: s.month || ind.month,
      threshold: s.threshold || ind.threshold,
      ownThreshold: s.threshold || '',
      defaultMonth: ind.month,
      defaultThreshold: ind.threshold,
      action: s.action || '',
    };
  }), [indicators, scores]);

  const save = useCallback(async (indicatorKey, patch) => {
    setError('');
    try {
      const { data } = await api.put('/so/scores', { school: schoolId, schoolYear: year, indicatorKey, ...patch });
      setScores((prev) => {
        const next = { ...prev };
        if (data.deleted) delete next[indicatorKey]; else next[indicatorKey] = data;
        return next;
      });
      return true;
    } catch (e) {
      setError(errMsg(e, 'Opslaan mislukt.'));
      return false;
    }
  }, [schoolId, year]);

  return { rok, indicators, rows, loading: loading || !templatesReady, error, save };
}
