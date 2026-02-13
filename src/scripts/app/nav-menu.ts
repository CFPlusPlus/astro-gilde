import type { Qs, Qsa } from './dom';

export interface NavMenuController {
  closeMenu: () => void;
  isMenuOpen: () => boolean;
}

export const initNavMenu = ({ qs, qsa }: { qs: Qs; qsa: Qsa }): NavMenuController => {
  const navRoot = qs<HTMLElement>('[data-site-nav]');
  const panel = qs<HTMLElement>('[data-nav-panel]', navRoot ?? document);
  const toggle = qs<HTMLElement>('[data-nav-toggle]', navRoot ?? document);
  const overlay = qs<HTMLElement>('[data-nav-overlay]', panel ?? document);
  const iconOpen = qs<HTMLElement>('[data-icon-open]', toggle ?? document);
  const iconClose = qs<HTMLElement>('[data-icon-close]', toggle ?? document);
  const menuBackgroundFallbackState = new WeakMap<
    HTMLElement,
    { ariaHidden: string | null; hadPointerEventsNone: boolean }
  >();

  const isMobile = (): boolean => window.matchMedia('(max-width: 767px)').matches;
  const menuSupportsInert = 'inert' in HTMLElement.prototype;
  let menuLastFocusedEl: HTMLElement | null = null;
  let menuFocusTrapBound = false;

  const getMenuBackgroundTargets = (): HTMLElement[] => {
    return Array.from(document.body.children).filter((child): child is HTMLElement => {
      if (!(child instanceof HTMLElement)) return false;
      if (!navRoot) return true;
      return child !== navRoot && !child.contains(navRoot);
    });
  };

  const setMenuBackgroundInert = (inert: boolean): void => {
    const targets = getMenuBackgroundTargets();

    if (menuSupportsInert) {
      targets.forEach((el) => {
        (el as HTMLElement & { inert: boolean }).inert = inert;
      });
      return;
    }

    if (inert) {
      targets.forEach((el) => {
        if (!menuBackgroundFallbackState.has(el)) {
          menuBackgroundFallbackState.set(el, {
            ariaHidden: el.getAttribute('aria-hidden'),
            hadPointerEventsNone: el.classList.contains('pointer-events-none'),
          });
        }

        el.setAttribute('aria-hidden', 'true');
        if (!el.classList.contains('pointer-events-none')) {
          el.classList.add('pointer-events-none');
        }
      });
      return;
    }

    targets.forEach((el) => {
      const prevState = menuBackgroundFallbackState.get(el);
      if (!prevState) return;

      if (prevState.ariaHidden === null) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', prevState.ariaHidden);

      if (!prevState.hadPointerEventsNone) {
        el.classList.remove('pointer-events-none');
      }
      menuBackgroundFallbackState.delete(el);
    });
  };

  const getMenuFocusable = (): HTMLElement[] => {
    if (!panel) return [];

    return qsa<HTMLElement>(
      'a[href], area[href], button, input, select, textarea, details summary, [tabindex]:not([tabindex="-1"])',
      panel,
    ).filter((el) => {
      if (el.hasAttribute('disabled')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return true;
    });
  };

  const trapMenuFocus = (e: KeyboardEvent): void => {
    if (!panel || !isMenuOpen() || !isMobile() || e.key !== 'Tab') return;

    const focusable = getMenuFocusable();
    if (!focusable.length) {
      e.preventDefault();
      if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1;
      panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!(active instanceof HTMLElement) || !panel.contains(active)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const bindMenuFocusTrap = (): void => {
    if (menuFocusTrapBound) return;
    document.addEventListener('keydown', trapMenuFocus);
    menuFocusTrapBound = true;
  };

  const unbindMenuFocusTrap = (): void => {
    if (!menuFocusTrapBound) return;
    document.removeEventListener('keydown', trapMenuFocus);
    menuFocusTrapBound = false;
  };

  const root = document.documentElement;
  let lockedScrollY = 0;
  let isScrollLocked = false;

  const lockScroll = (): void => {
    if (isScrollLocked) return;
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    isScrollLocked = true;

    root.dataset.menuOpen = '1';
    root.style.overflow = 'hidden';

    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  };

  const unlockScroll = (): void => {
    if (!isScrollLocked) {
      delete root.dataset.menuOpen;
      root.style.overflow = '';
      return;
    }

    isScrollLocked = false;
    delete root.dataset.menuOpen;
    root.style.overflow = '';

    const y = lockedScrollY;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';

    window.scrollTo(0, y);
  };

  const closeMenu = (): void => {
    if (!panel || !toggle) return;
    panel.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
    if (iconOpen) iconOpen.classList.remove('hidden');
    if (iconClose) iconClose.classList.add('hidden');

    unbindMenuFocusTrap();
    setMenuBackgroundInert(false);
    unlockScroll();

    if (menuLastFocusedEl && document.contains(menuLastFocusedEl)) {
      menuLastFocusedEl.focus();
    }
    menuLastFocusedEl = null;
  };

  const openMenu = (): void => {
    if (!panel || !toggle) return;
    menuLastFocusedEl =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    panel.classList.remove('hidden');
    if (overlay) overlay.classList.toggle('hidden', !isMobile());
    toggle.setAttribute('aria-expanded', 'true');
    if (iconOpen) iconOpen.classList.add('hidden');
    if (iconClose) iconClose.classList.remove('hidden');

    if (isMobile()) {
      lockScroll();
      setMenuBackgroundInert(true);
      bindMenuFocusTrap();

      window.setTimeout(() => {
        const firstFocusable = getMenuFocusable()[0];
        if (firstFocusable) firstFocusable.focus();
      }, 0);
      return;
    }

    unlockScroll();
    setMenuBackgroundInert(false);
    unbindMenuFocusTrap();
  };

  const isMenuOpen = (): boolean => Boolean(panel && !panel.classList.contains('hidden'));

  if (toggle && panel) {
    if (!toggle.hasAttribute('aria-controls') && panel.id) {
      toggle.setAttribute('aria-controls', panel.id);
    }
    toggle.setAttribute('aria-expanded', isMenuOpen() ? 'true' : 'false');

    toggle.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      if (isMenuOpen()) closeMenu();
      else openMenu();
    });

    document.addEventListener('click', (e: MouseEvent) => {
      if (!isMenuOpen()) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (panel.contains(target) || toggle.contains(target)) return;
      closeMenu();
    });

    if (overlay) {
      overlay.addEventListener('click', () => closeMenu());
    }

    panel.addEventListener('click', (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a');
      if (link) closeMenu();
    });

    let lastMobileState = isMobile();
    window.addEventListener('resize', () => {
      const mobileState = isMobile();

      // Menue bei mobilen Hoehenaenderungen (Adressleiste ein/aus) offen lassen,
      // aber beim Wechsel ueber den Mobile/Desktop-Breakpoint schliessen.
      if (mobileState !== lastMobileState) {
        closeMenu();
        lastMobileState = mobileState;
        return;
      }

      if (!isMenuOpen()) return;
      if (overlay) overlay.classList.toggle('hidden', !mobileState);
      if (mobileState) lockScroll();
      else unlockScroll();
    });
  }

  return { closeMenu, isMenuOpen };
};
