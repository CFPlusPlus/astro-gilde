/*
  app.ts
  ------
  Global behavior for the site:
  - Theme toggle (system/light/dark) with localStorage
  - Navbar menu toggle + click-outside + escape
  - Copy server IP helper
  - Online counters (Discord + Minecraft)
  - Lightweight toast
*/

type ThemeMode = 'system' | 'light' | 'dark';
type ToastVariant = 'default' | 'error';

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
      // ignore localStorage write errors
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

    window.addEventListener('resize', () => closeMenu());
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

  const fetchDiscordOnlineUsers = async (): Promise<string> => {
    try {
      const guildId = config.discordGuildId;
      if (!guildId) return 'Keine';

      const apiWidgetUrl = `https://discord.com/api/guilds/${guildId}/widget.json`;
      const response = await fetch(apiWidgetUrl, { cache: 'no-store' });
      const data = (await response.json()) as DiscordWidgetResponse;

      return data.presence_count ? String(data.presence_count) : 'Keine';
    } catch {
      return 'Keine';
    }
  };

  const fetchDiscordMemberCount = async (): Promise<string> => {
    try {
      const code = config.discordInviteCode;
      if (!code) return '�';

      const apiUrl = `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`;
      const response = await fetch(apiUrl, { cache: 'no-store' });
      const data = (await response.json()) as DiscordInviteResponse;
      const count = data.approximate_member_count;

      return count != null ? String(count) : '�';
    } catch {
      return '�';
    }
  };

  const fetchMinecraftOnlinePlayers = async (): Promise<string> => {
    try {
      const ip = config.serverIp || 'minecraft-gilde.de';
      const apiUrl = `https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`;
      const response = await fetch(apiUrl, { cache: 'no-store' });
      const data = (await response.json()) as MinecraftStatusResponse;

      return data.players?.online != null ? String(data.players.online) : 'Keine';
    } catch (e) {
      console.warn('Minecraft Online-Count Fehler:', e);
      return 'Keine';
    }
  };

  const discordTargets = qsa<HTMLElement>('[data-discord-online]');
  const discordMemberTargets = qsa<HTMLElement>('[data-discord-members]');
  const mcTargets = qsa<HTMLElement>('[data-mc-online]');

  const updateCounters = async (): Promise<void> => {
    if (discordTargets.length) {
      const val = await fetchDiscordOnlineUsers();
      discordTargets.forEach((el) => {
        el.textContent = val;
      });
    }

    if (discordMemberTargets.length) {
      const raw = await fetchDiscordMemberCount();
      const val = formatInt(raw);
      discordMemberTargets.forEach((el) => {
        el.textContent = val;
      });
    }

    if (mcTargets.length) {
      const val = await fetchMinecraftOnlinePlayers();
      mcTargets.forEach((el) => {
        el.textContent = val;
      });
    }
  };

  if (discordTargets.length || discordMemberTargets.length || mcTargets.length) {
    void updateCounters();
  }
})();
