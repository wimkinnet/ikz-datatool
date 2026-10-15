import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { currentSchoolYear } from '../utils/constants';

const AppContext = createContext(null);

// Holds what almost every screen needs: the schools the user may see and the active school + school year.
export function AppProvider({ children }) {
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [storedSchool, setStoredSchool] = useState(localStorage.getItem('schoolId') || '');
  const [year, setYearState] = useState(localStorage.getItem('year') || currentSchoolYear());
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/schools');
    setSchools(data);
    setReady(true);
  }, []);

  useEffect(() => {
    if (user) load().catch(() => setReady(true));
    else setReady(false);
  }, [user, load]);

  // The active school: the one picked last, falling back to the first the user can access
  const schoolId = useMemo(() => {
    if (!user) return '';
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

  return (
    <AppContext.Provider value={{ schools, school, schoolId, setSchoolId, year, setYear, ready, reload: load }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
