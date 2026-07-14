const STORAGE_KEY = 'vox-labs-theme';
const THEME = {
  DARK: 'dark',
  LIGHT: 'light',
};
const THEME_COLOR = {
  [THEME.LIGHT]: '#f4f9f6',
  [THEME.DARK]: '#000000',
};

const elements = {
  btn: document.getElementById('theme-toggle'),
  iconMoon: document.getElementById('icon-moon'),
  iconSun: document.getElementById('icon-sun'),
  metaThemeColor: document.querySelector('meta[name="theme-color"]'),
};

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || THEME.DARK;
}

function setMetaThemeColor(theme) {
  if (!elements.metaThemeColor) return;
  elements.metaThemeColor.setAttribute('content', THEME_COLOR[theme]);
}

function reflectIcons(theme) {
  const isLight = theme === THEME.LIGHT;
  elements.iconMoon?.classList.toggle('hidden', isLight);
  elements.iconSun?.classList.toggle('hidden', !isLight);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable; theme still works for the session.
  }
  reflectIcons(theme);
  setMetaThemeColor(theme);
}

function toggleTheme() {
  const nextTheme = getCurrentTheme() === THEME.LIGHT ? THEME.DARK : THEME.LIGHT;
  applyTheme(nextTheme);
}

applyTheme(getCurrentTheme());
elements.btn?.addEventListener('click', toggleTheme);