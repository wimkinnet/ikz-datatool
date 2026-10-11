import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { currentSchoolYear, SECTORS } from '../utils/constants';

const AppContext = createContext(null);

// Holds what almost every screen needs: the active sector (BO/SO), the schools the user may see in it,
// the active school + school year, and the dropdown lists (formerly the "Verwijzigen" tab).
export function AppProvider({ children }) {
  const { user } = useAuth();
  const [allSchools, setAllSchools] = useState([]);
  const [refs, setRefs] = useState({});
  const [storedSector, setStoredSector] = useState(localStorage.getItem('sector') || '');
  const [storedSchool, setStoredSchool] = useState(() => {
    try { return JSON.parse(localStorage.getItem('schoolBySector')) || {}; } catch { return {}; }
  });
  const [year, setYearState] = useState(localStorage.getItem('year') || currentSchoolYear());
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([api.get('/schools'), api.get('/references')]);
    setAllSchools(s.data);
    setRefs(r.data);
    setReady(true);
  }, []);

  useEffect(() => {
    if (user) load().catch(() => setReady(true));
    else setReady(false);
  }, [user, load]);

  // Admins work in both sectors; everyone else in the sectors of the schools they are linked to
  const sectors = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return SECTORS.map((s) => s.key);
    return SECTORS.map((s) => s.key).filter((key) => allSchools.some((s) => s.type === key));
  }, [user, allSchools]);
  const sector = sectors.includes(storedSector) ? storedSector : sectors.includes('SO') ? 'SO' : sectors[0] || '';
  const setSector = (key) => {
    localStorage.setItem('sector', key);
    setStoredSector(key);
  };

  // The schools of the active sector; the active school is remembered per sector (falling back to the first)
  const schools = useMemo(() => allSchools.filter((s) => s.type === sector), [allSchools, sector]);
  const schoolId = useMemo(() => {
    if (!user) return '';
    if (schools.some((s) => s._id === storedSchool[sector])) return storedSchool[sector];
    return schools[0]?._id || '';
  }, [user, schools, storedSchool, sector]);

  const school = schools.find((s) => s._id === schoolId) || null;

  const setSchoolId = (id) => {
    const next = { ...storedSchool, [sector]: id };
    localStorage.setItem('schoolBySector', JSON.stringify(next));
    setStoredSchool(next);
  };
  const setYear = (y) => {
    localStorage.setItem('year', y);
    setYearState(y);
  };

  const refList = (name) => refs[name] || [];
  const refLabel = (name, key) => refList(name).find((i) => i.key === key)?.label || key || '';
  const canEditPlanStructure = !!user && (user.role !== 'client' || !!school?.clientCanEditPlanStructure);

  return (
    <AppContext.Provider
      value={{ sector, setSector, sectors, allSchools, schools, school, schoolId, setSchoolId, year, setYear, refs, refList, refLabel, ready, reload: load, canEditPlanStructure }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
