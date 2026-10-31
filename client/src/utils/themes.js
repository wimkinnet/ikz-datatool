// The two house styles of the tool. Colours and fonts live in index.css (:root and :root[data-theme=…]);
// the server stores which one a user sees (User.theme).
export const THEMES = [
  { key: 'bespreek', label: 'bespreek', logo: '/brand/bespreek.png', barColor: '#034242' },
  { key: 'catalista', label: 'Catalista', logo: '/brand/catalista.png', barColor: '#3f587e' },
];
export const DEFAULT_THEME = 'bespreek';
export const themeOf = (key) => THEMES.find((t) => t.key === key) || THEMES[0];

// Remembered on this device so the login page, shown before we know the user, keeps the right look
export const storedTheme = () => localStorage.getItem('theme') || DEFAULT_THEME;

export function applyTheme(key) {
  const t = themeOf(key);
  document.documentElement.dataset.theme = t.key;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.barColor);
  localStorage.setItem('theme', t.key);
}
