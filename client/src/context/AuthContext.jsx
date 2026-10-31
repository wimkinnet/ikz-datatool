import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';
import { applyTheme, storedTheme } from '../utils/themes';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    const theme = storedTheme();
    localStorage.clear();
    applyTheme(theme); // the login page keeps the look this person knows
    setUser(null);
  }, []);

  const updateUser = useCallback((u) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, []);

  // The house style follows the user; refresh on load so a style set by an admin applies at the next visit
  useEffect(() => { if (user?.theme) applyTheme(user.theme); }, [user?.theme]);
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me').then(({ data }) => updateUser(data.user)).catch(() => {});
  }, [updateUser]);

  return <AuthContext.Provider value={{ user, login, logout, updateUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
