const btn = document.getElementById('theme-toggle');
const iconMoon = document.getElementById('icon-moon');
const iconSun = document.getElementById('icon-sun');
const metaThemeColor = document.querySelector('meta[name="theme-color"]');

function reflectTheme(theme) {
  iconMoon.classList.toggle('hidden', theme === 'light');
  iconSun.classList.toggle('hidden', theme !== 'light');
  if (metaThemeColor) metaThemeColor.setAttribute('content', theme === 'light' ? '#f4f9f6' : '#000000');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('vox-labs-theme', theme);
  } catch {}
  reflectTheme(theme);
}

reflectTheme(document.documentElement.getAttribute('data-theme') || 'dark');

btn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(next);
});
