export type ThemePref = 'system' | 'light' | 'dark';

const THEME_KEY = 'utreker_theme';

// Default is 'system': follow the OS until the user makes an explicit choice.
export function getThemePref(): ThemePref {
  const value = localStorage.getItem(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function applyThemePref(pref: ThemePref): void {
  if (pref === 'system') {
    // No data-theme attribute → the CSS prefers-color-scheme media query decides,
    // which also updates live when the OS theme changes.
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = pref;
  }
}

export function setThemePref(pref: ThemePref): void {
  if (pref === 'system') {
    localStorage.removeItem(THEME_KEY);
  } else {
    localStorage.setItem(THEME_KEY, pref);
  }
  applyThemePref(pref);
}
