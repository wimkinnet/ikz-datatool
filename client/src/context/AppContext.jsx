import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { currentSchoolYear } from '../utils/constants';

const AppContext = createContext(null);

// Holds what almost every screen needs: the schools the user may see, the active school + school year,
// and the dropdown lists (formerly the "Verwijzigen" tab).
export function AppProvider({ children }) {
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [refs, setRefs] = useState({});
  const [storedSchool, setStoredSchool] = useState(localStorage.getItem('schoolId') || '');
  const [year, setYearState] = useState(localStorage.getItem('year') || currentSchoolYear());
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([api.get('/schools'), api.get('/references')]);
    setSchools(s.data);
    setRefs(r.data);
    setReady(true);
  }, []);

  useEffect(() => {
    if (user) load().catch(() => setReady(true));
    else setReady(false);
  }, [user, load]);

  // Clients are pinned to their own school; staff pick one (falling back to the first they can access)
  const schoolId = useMemo(() => {
    if (!user) return '';
    if (user.role === 'client') return user.school || '';
    if (schools.some((s) => s._id === storedSchool)) return storedSchool;
    return schools[0]?._id || '';
  }, [user, schools, storedSchool]);

  const school = schools.find((s) => s._id === schoolId) || null;

  const setSchoolId = (id) => {
    localStorage.setItem('schoolId', id);
    setStoredSchool(id);
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
      value={{ schools, school, schoolId, setSchoolId, year, setYear, refs, refList, refLabel, ready, reload: load, canEditPlanStructure }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
