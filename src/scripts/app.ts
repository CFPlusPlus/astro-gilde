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
  const config: BrowserAppConfig = window.__APP_CONFIG__ ?? {
    serverIp: 'minecraft-gilde.de',
    discordGuildId: '1219625244906754093',
    discordInvite: 'https://discord.minecraft-gilde.de',
    dynmapUrl: 'https://map.minecraft-gilde.de',
  };

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

  const isMobile = (): boolean => window.matchMedia('(max-width: 767px)').matches;

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

    unlockScroll();
  };

  const openMenu = (): void => {
    if (!panel || !toggle) return;
    panel.classList.remove('hidden');
    if (overlay) overlay.classList.toggle('hidden', !isMobile());
    toggle.setAttribute('aria-expanded', 'true');
    if (iconOpen) iconOpen.classList.add('hidden');
    if (iconClose) iconClose.classList.remove('hidden');

    if (isMobile()) lockScroll();
    else unlockScroll();
  };

  const isMenuOpen = (): boolean => Boolean(panel && !panel.classList.contains('hidden'));

  if (toggle && panel) {
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

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen()) closeMenu();
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
      const result = window.prompt('IP kopieren:', text);
      return result !== null;
    } catch {
      return false;
    }
  };

  const copyIp = async (): Promise<void> => {
    const ip = config.serverIp || 'minecraft-gilde.de';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(ip);
      } else {
        const ok = fallbackCopy(ip);
        if (!ok) throw new Error('Clipboard API nicht verfuegbar');
      }
      showToast('IP kopiert!');
    } catch (e) {
      console.warn('Copy-IP Fehler:', e);
      showToast('Kopieren nicht moeglich.', 'error');
    }
  };

  qsa<HTMLElement>('[data-copy-ip]').forEach((btn) => {
    btn.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      void copyIp();
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
