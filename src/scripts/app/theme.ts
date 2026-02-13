import type { Qs, Qsa } from './dom';
import type { ShowToast } from './toast';

type ThemeMode = 'system' | 'light' | 'dark';

export const initTheme = ({
  qs,
  qsa,
  showToast,
}: {
  qs: Qs;
  qsa: Qsa;
  showToast: ShowToast;
}): void => {
  const THEME_KEY = 'theme';
  const VALID_THEMES: ReadonlySet<ThemeMode> = new Set(['system', 'light', 'dark']);

  const getStoredTheme = (): ThemeMode => {
    try {
      const value = localStorage.getItem(THEME_KEY);
      if (value && VALID_THEMES.has(value as ThemeMode)) {
        return value as ThemeMode;
      }
      return 'system';
    } catch {
      return 'system';
    }
  };

  const applyTheme = (mode: ThemeMode): void => {
    const root = document.documentElement;

    if (mode === 'light' || mode === 'dark') root.dataset.theme = mode;
    else root.removeAttribute('data-theme');

    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // Schreibfehler bei localStorage ignorieren
    }

    qsa<HTMLElement>('[data-theme-icon]').forEach((el) => {
      const iconMode = el.getAttribute('data-theme-icon');
      const shouldShow = iconMode === mode;
      if (shouldShow) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });
  };

  const cycleTheme = (): ThemeMode => {
    const current = getStoredTheme();
    if (current === 'system') return 'dark';
    if (current === 'dark') return 'light';
    return 'system';
  };

  applyTheme(getStoredTheme());

  const themeBtn = qs<HTMLElement>('[data-theme-toggle]');
  if (!themeBtn) return;

  themeBtn.addEventListener('click', () => {
    const next = cycleTheme();
    applyTheme(next);
    const label = next === 'system' ? 'System' : next === 'dark' ? 'Dark' : 'Light';
    showToast(`Theme: ${label}`);
  });
};
