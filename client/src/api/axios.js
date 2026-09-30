import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.sentToken = token || '';
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // An expired/invalid session sends the user back to the login page (but not when the login itself failed).
    // Only when the rejected token is still the stored one: a stale tab (or a page Chrome prerendered) that
    // gets a 401 for an old/missing token must not wipe a fresh login made in the meantime.
    const current = localStorage.getItem('token') || '';
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login') && err.config?.sentToken === current) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (err, fallback = 'Er ging iets mis.') => err?.response?.data?.message || fallback;

export default api;
