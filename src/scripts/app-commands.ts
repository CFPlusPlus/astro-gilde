/* Sucht clientseitig auf /befehle und filtert Command-Karten innerhalb der Kategorien. */
import { setSoftVisibility } from './app/motion/visibility';

(() => {
  const input = document.getElementById('commandSearch');
  const root = document.querySelector<HTMLElement>('[data-commands]');
  if (!(input instanceof HTMLInputElement) || !root) return;

  const clearBtn = root.querySelector<HTMLElement>('[data-command-search-clear]');
  const norm = (value: unknown): string => String(value ?? '').toLowerCase();

  const cats = Array.from(root.querySelectorAll<HTMLElement>('[data-category]'));

  const syncClear = (): void => {
    if (!clearBtn) return;
    const hasValue = norm(input.value).trim().length > 0;
    clearBtn.classList.toggle('mg-search-clear--hidden', !hasValue);
    clearBtn.tabIndex = hasValue ? 0 : -1;
  };

  const apply = (): void => {
    const q = norm(input.value).trim();
    syncClear();

    // Keine Suche -> alles anzeigen
    if (!q) {
      cats.forEach((cat) => {
        setSoftVisibility(cat, true);
        cat
          .querySelectorAll<HTMLElement>('[data-command]')
          .forEach((item) => setSoftVisibility(item, true));
      });
      return;
    }

    cats.forEach((cat) => {
      const items = Array.from(cat.querySelectorAll<HTMLElement>('[data-command]'));
      let visible = 0;

      items.forEach((item) => {
        const hay = norm(item.getAttribute('data-search'));
        const ok = hay.includes(q);
        if (ok) {
          setSoftVisibility(item, true);
          visible++;
        } else {
          setSoftVisibility(item, false);
        }
      });

      setSoftVisibility(cat, visible > 0);

      const details = cat.closest('details');
      if (details instanceof HTMLDetailsElement) {
        details.open = visible > 0;
      }
    });
  };

  input.addEventListener('input', apply);
  root.addEventListener('click', (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest('[data-command-search-clear]');
    if (!trigger || !clearBtn) return;
    if (clearBtn.classList.contains('mg-search-clear--hidden')) return;
    e.preventDefault();
    input.value = '';
    apply();
    input.focus();
  });

  if (clearBtn) {
    clearBtn.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      input.value = '';
      apply();
      input.focus();
    });
  }

  syncClear();
})();
