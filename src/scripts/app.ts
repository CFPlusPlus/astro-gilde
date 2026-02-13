import { readBrowserAppConfig } from './app-config';

/*
  Globales Verhalten der Seite:
  - Theme-Toggle (system/light/dark) mit localStorage
  - Navbar-Menue-Toggle + Click-Outside + Escape
  - Helper zum Kopieren der Server-IP
  - Online-Zaehler (Discord + Minecraft)
  - Schlanker Toast
*/

type ThemeMode = 'system' | 'light' | 'dark';
type ToastVariant = 'default' | 'error';
const UNKNOWN_FALLBACK = 'unbekannt';
const LIVE_ERROR_FALLBACK = 'Derzeit nicht verfuegbar';
const LIVE_CACHE_PREFIX = 'mg:live-counter:v1:';
const LIVE_CACHE_TTL_MS = 180_000;
const LIVE_FETCH_TIMEOUT_MS = 6_500;
const LIVE_IDLE_TIMEOUT_MS = 1_600;
const LIVE_IDLE_FALLBACK_DELAY_MS = 320;

type LiveCounterKey = 'discord-online' | 'discord-members' | 'mc-online';

interface DiscordWidgetResponse {
  presence_count?: number;
}

interface DiscordInviteResponse {
  approximate_member_count?: number;
}

interface MinecraftStatusResponse {
  players?: {
    online?: number;
  };
}

interface LiveCounterCacheEntry {
  value: string;
  timestamp: number;
}

(() => {
  const config = readBrowserAppConfig({
    serverIp: 'minecraft-gilde.de',
    discordGuildId: '1219625244906754093',
    discordInvite: 'https://discord.minecraft-gilde.de',
    dynmapUrl: 'https://map.minecraft-gilde.de',
  });

  const qs = <T extends Element>(sel: string, root: ParentNode = document): T | null =>
    root.querySelector<T>(sel);
  const qsa = <T extends Element>(sel: string, root: ParentNode = document): T[] =>
    Array.from(root.querySelectorAll<T>(sel));

  const toastEl = qs<HTMLElement>('#toast');
  let toastTimer: number | null = null;

  const showToast = (message: unknown, variant: ToastVariant = 'default'): void => {
    if (!toastEl) return;
    if (toastTimer != null) window.clearTimeout(toastTimer);

    toastEl.classList.remove('hidden');
    toastEl.replaceChildren();

    const card = document.createElement('div');
    card.className = `pointer-events-auto mg-card px-4 py-3 shadow-sm ${
      variant === 'error' ? 'border-accent/30 bg-accent/10' : ''
    }`.trim();
    card.setAttribute('role', 'status');

    const text = document.createElement('p');
    text.className = 'text-sm text-fg/90';
    text.textContent = String(message);

    card.appendChild(text);
    toastEl.appendChild(card);

    toastTimer = window.setTimeout(() => {
      toastEl.classList.add('hidden');
      toastEl.replaceChildren();
    }, 2200);
  };

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
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = cycleTheme();
      applyTheme(next);
      const label = next === 'system' ? 'System' : next === 'dark' ? 'Dark' : 'Light';
      showToast(`Theme: ${label}`);
    });
  }

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

  const fallbackCopy = (text: string): boolean => {
    try {
      const result = window.prompt('Server-IP kopieren:', text);
      return result !== null;
    } catch {
      return false;
    }
  };

  const copyIp = async (opts?: { silentSuccess?: boolean }): Promise<boolean> => {
    const { silentSuccess = false } = opts ?? {};
    const ip = config.serverIp || 'minecraft-gilde.de';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(ip);
      } else {
        const ok = fallbackCopy(ip);
        if (!ok) throw new Error('Clipboard API nicht verfuegbar');
      }
      if (!silentSuccess) showToast('IP kopiert!');
      return true;
    } catch (e) {
      console.warn('Copy-IP Fehler:', e);
      showToast('Kopieren nicht moeglich.', 'error');
      return false;
    }
  };

  const joinModalRoot = qs<HTMLElement>('[data-join-modal]');
  const joinModalDialog = qs<HTMLElement>('[data-join-modal-dialog]', joinModalRoot ?? document);
  const joinModalOverlay = qs<HTMLElement>('[data-join-modal-overlay]', joinModalRoot ?? document);
  const joinModalCloseButtons = qsa<HTMLElement>(
    '[data-join-modal-close]',
    joinModalRoot ?? document,
  );
  const joinModalCopyButtons = qsa<HTMLElement>('[data-copy-ip-modal]', joinModalRoot ?? document);
  const joinModalCopyFeedbackTimers = new WeakMap<HTMLElement, number>();
  const inlineCopyButtons = qsa<HTMLElement>('[data-copy-ip-inline]');
  const inlineCopyFeedbackTimers = new WeakMap<HTMLElement, number>();

  let modalLastFocusedEl: HTMLElement | null = null;
  let bodyOverflowBeforeModal = '';

  const isJoinModalOpen = (): boolean =>
    Boolean(joinModalRoot && !joinModalRoot.classList.contains('hidden'));

  const getJoinModalFocusable = (): HTMLElement[] => {
    if (!joinModalDialog) return [];

    return qsa<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
      joinModalDialog,
    ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  };

  const closeJoinModal = (): void => {
    if (!joinModalRoot || !isJoinModalOpen()) return;

    joinModalRoot.classList.add('hidden');
    joinModalRoot.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = bodyOverflowBeforeModal;

    if (modalLastFocusedEl && document.contains(modalLastFocusedEl)) {
      modalLastFocusedEl.focus();
    }
  };

  const openJoinModal = (): void => {
    if (!joinModalRoot || !joinModalDialog || isJoinModalOpen()) return;

    modalLastFocusedEl =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    bodyOverflowBeforeModal = document.body.style.overflow;

    joinModalRoot.classList.remove('hidden');
    joinModalRoot.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => {
      const focusTarget = getJoinModalFocusable()[0] ?? joinModalDialog;
      focusTarget.focus();
    }, 0);
  };

  const trapJoinModalFocus = (e: KeyboardEvent): void => {
    if (!joinModalDialog || !isJoinModalOpen() || e.key !== 'Tab') return;

    const focusable = getJoinModalFocusable();
    if (!focusable.length) {
      e.preventDefault();
      joinModalDialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

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

  if (joinModalOverlay) {
    joinModalOverlay.addEventListener('click', () => closeJoinModal());
  }

  joinModalCloseButtons.forEach((btn) => {
    btn.addEventListener('click', () => closeJoinModal());
  });

  const setModalCopyButtonState = (btn: HTMLElement, copied: boolean): void => {
    const stateDefault = qs<HTMLElement>('[data-copy-ip-modal-state-default]', btn);
    const stateSuccess = qs<HTMLElement>('[data-copy-ip-modal-state-success]', btn);

    if (copied) btn.dataset.copied = 'true';
    else delete btn.dataset.copied;

    if (stateDefault) stateDefault.classList.toggle('opacity-0', copied);
    if (stateSuccess) stateSuccess.classList.toggle('opacity-0', !copied);

    btn.setAttribute('aria-label', copied ? 'Server-IP wurde kopiert' : 'Server-IP kopieren');
  };

  const flashModalCopyButton = (btn: HTMLElement): void => {
    const runningTimer = joinModalCopyFeedbackTimers.get(btn);
    if (runningTimer != null) window.clearTimeout(runningTimer);

    setModalCopyButtonState(btn, true);

    const timer = window.setTimeout(() => {
      setModalCopyButtonState(btn, false);
      joinModalCopyFeedbackTimers.delete(btn);
    }, 1600);
    joinModalCopyFeedbackTimers.set(btn, timer);
  };

  joinModalCopyButtons.forEach((btn) => {
    btn.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      const ok = await copyIp({ silentSuccess: true });
      if (ok) flashModalCopyButton(btn);
    });
  });

  const setInlineCopyButtonState = (btn: HTMLElement, copied: boolean): void => {
    const labelDefault = qs<HTMLElement>('[data-copy-ip-inline-label-default]', btn);
    const labelSuccess = qs<HTMLElement>('[data-copy-ip-inline-label-success]', btn);

    if (copied) btn.dataset.copied = 'true';
    else delete btn.dataset.copied;

    if (labelDefault) labelDefault.classList.toggle('opacity-0', copied);
    if (labelSuccess) labelSuccess.classList.toggle('opacity-0', !copied);

    btn.setAttribute('aria-label', copied ? 'Server-IP wurde kopiert' : 'Server-IP kopieren');
  };

  const flashInlineCopyButton = (btn: HTMLElement): void => {
    const runningTimer = inlineCopyFeedbackTimers.get(btn);
    if (runningTimer != null) window.clearTimeout(runningTimer);

    setInlineCopyButtonState(btn, true);

    const timer = window.setTimeout(() => {
      setInlineCopyButtonState(btn, false);
      inlineCopyFeedbackTimers.delete(btn);
    }, 1600);
    inlineCopyFeedbackTimers.set(btn, timer);
  };

  inlineCopyButtons.forEach((btn) => {
    btn.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      const ok = await copyIp({ silentSuccess: true });
      if (ok) flashInlineCopyButton(btn);
    });
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isJoinModalOpen()) {
        e.preventDefault();
        closeJoinModal();
        return;
      }

      if (isMenuOpen()) closeMenu();
      return;
    }

    trapJoinModalFocus(e);
  });

  qsa<HTMLElement>('[data-copy-ip]').forEach((btn) => {
    btn.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      closeMenu();
      openJoinModal();
    });
  });

  const formatInt = (value: unknown): string => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('de-DE') : String(value);
  };

  const readCounterCache = (key: LiveCounterKey, allowExpired = false): string | null => {
    try {
      const raw = localStorage.getItem(`${LIVE_CACHE_PREFIX}${key}`);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as LiveCounterCacheEntry;
      if (typeof parsed?.value !== 'string') return null;
      if (typeof parsed?.timestamp !== 'number') return null;

      const ageMs = Date.now() - parsed.timestamp;
      if (!allowExpired && ageMs > LIVE_CACHE_TTL_MS) return null;
      return parsed.value;
    } catch {
      return null;
    }
  };

  const writeCounterCache = (key: LiveCounterKey, value: string): void => {
    try {
      const payload: LiveCounterCacheEntry = {
        value,
        timestamp: Date.now(),
      };
      localStorage.setItem(`${LIVE_CACHE_PREFIX}${key}`, JSON.stringify(payload));
    } catch {
      // Schreibfehler bei localStorage ignorieren
    }
  };

  const fetchJsonWithTimeout = async <T>(url: string): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), LIVE_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const fetchDiscordOnlineUsers = async (): Promise<string | null> => {
    try {
      const guildId = config.discordGuildId;
      if (!guildId) return 'Keine';

      const apiWidgetUrl = `https://discord.com/api/guilds/${guildId}/widget.json`;
      const data = await fetchJsonWithTimeout<DiscordWidgetResponse>(apiWidgetUrl);
      const count = data.presence_count;

      return count != null ? String(count) : 'Keine';
    } catch {
      return null;
    }
  };

  const fetchDiscordMemberCount = async (): Promise<string | null> => {
    try {
      const code = config.discordInviteCode;
      if (!code) return UNKNOWN_FALLBACK;

      const apiUrl = `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`;
      const data = await fetchJsonWithTimeout<DiscordInviteResponse>(apiUrl);
      const count = data.approximate_member_count;

      return count != null ? String(count) : UNKNOWN_FALLBACK;
    } catch {
      return null;
    }
  };

  const fetchMinecraftOnlinePlayers = async (): Promise<string | null> => {
    try {
      const ip = config.serverIp || 'minecraft-gilde.de';
      const apiUrl = `https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`;
      const data = await fetchJsonWithTimeout<MinecraftStatusResponse>(apiUrl);

      return data.players?.online != null ? String(data.players.online) : 'Keine';
    } catch (e) {
      console.warn('Minecraft Online-Count Fehler:', e);
      return null;
    }
  };

  const discordTargets = qsa<HTMLElement>('[data-discord-online]');
  const discordMemberTargets = qsa<HTMLElement>('[data-discord-members]');
  const mcTargets = qsa<HTMLElement>('[data-mc-online]');

  const setTargetsState = (
    targets: HTMLElement[],
    state: 'loading' | 'ready' | 'error',
    text: string,
  ): void => {
    targets.forEach((el) => {
      el.classList.add('mg-live-counter');
      el.dataset.liveState = state;
      el.textContent = text;

      if (state === 'loading') {
        el.setAttribute('aria-busy', 'true');
      } else {
        el.removeAttribute('aria-busy');
      }
    });
  };

  const updateCounter = async (opts: {
    key: LiveCounterKey;
    targets: HTMLElement[];
    fetcher: () => Promise<string | null>;
    format?: (value: string) => string;
    errorText?: string;
  }): Promise<void> => {
    const { key, targets, fetcher, format, errorText = LIVE_ERROR_FALLBACK } = opts;
    if (!targets.length) return;

    const staleCache = readCounterCache(key, true);

    const latest = await fetcher();
    if (latest != null) {
      writeCounterCache(key, latest);
      const value = format ? format(latest) : latest;
      setTargetsState(targets, 'ready', value);
      return;
    }

    if (staleCache != null) {
      const value = format ? format(staleCache) : staleCache;
      setTargetsState(targets, 'ready', value);
      return;
    }

    setTargetsState(targets, 'error', errorText);
  };

  const runWhenIdleOrInteracted = (cb: () => void): void => {
    const idleApi = window as Window & {
      requestIdleCallback?: (callback: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    let started = false;
    let idleTimeout: number | null = null;
    let idleHandle: number | null = null;

    const runOnce = (): void => {
      if (started) return;
      started = true;

      cleanup();
      cb();
    };

    const onFirstInteraction = (): void => runOnce();

    const cleanup = (): void => {
      window.removeEventListener('pointerdown', onFirstInteraction, true);
      window.removeEventListener('keydown', onFirstInteraction, true);
      window.removeEventListener('scroll', onFirstInteraction, true);
      window.removeEventListener('wheel', onFirstInteraction, true);
      window.removeEventListener('touchstart', onFirstInteraction, true);

      if (idleHandle != null && typeof idleApi.cancelIdleCallback === 'function') {
        idleApi.cancelIdleCallback(idleHandle);
      }
      if (idleTimeout != null) window.clearTimeout(idleTimeout);
    };

    window.addEventListener('pointerdown', onFirstInteraction, { capture: true, once: true });
    window.addEventListener('keydown', onFirstInteraction, { capture: true, once: true });
    window.addEventListener('scroll', onFirstInteraction, {
      capture: true,
      passive: true,
      once: true,
    });
    window.addEventListener('wheel', onFirstInteraction, {
      capture: true,
      passive: true,
      once: true,
    });
    window.addEventListener('touchstart', onFirstInteraction, {
      capture: true,
      passive: true,
      once: true,
    });

    if (typeof idleApi.requestIdleCallback === 'function') {
      idleHandle = idleApi.requestIdleCallback(
        () => {
          runOnce();
        },
        { timeout: LIVE_IDLE_TIMEOUT_MS },
      );
      return;
    }

    idleTimeout = window.setTimeout(() => {
      runOnce();
    }, LIVE_IDLE_FALLBACK_DELAY_MS);
  };

  const hasLiveTargets = discordTargets.length || discordMemberTargets.length || mcTargets.length;
  if (hasLiveTargets) {
    const primeCounter = (
      key: LiveCounterKey,
      targets: HTMLElement[],
      format?: (value: string) => string,
    ): void => {
      if (!targets.length) return;

      const freshCache = readCounterCache(key, false);
      if (freshCache != null) {
        const value = format ? format(freshCache) : freshCache;
        setTargetsState(targets, 'ready', value);
        return;
      }

      if (key === 'discord-members') {
        setTargetsState(targets, 'ready', '-');
        return;
      }

      setTargetsState(targets, 'loading', 'Laden...');
    };

    primeCounter('discord-online', discordTargets);
    primeCounter('discord-members', discordMemberTargets, formatInt);
    primeCounter('mc-online', mcTargets);

    runWhenIdleOrInteracted(() => {
      void Promise.all([
        updateCounter({
          key: 'discord-online',
          targets: discordTargets,
          fetcher: fetchDiscordOnlineUsers,
        }),
        updateCounter({
          key: 'discord-members',
          targets: discordMemberTargets,
          fetcher: fetchDiscordMemberCount,
          format: formatInt,
          errorText: UNKNOWN_FALLBACK,
        }),
        updateCounter({
          key: 'mc-online',
          targets: mcTargets,
          fetcher: fetchMinecraftOnlinePlayers,
        }),
      ]);
    });
  }
})();
