import type { Qsa } from './dom';

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

export const initLiveCounters = ({ config, qsa }: { config: BrowserAppConfig; qsa: Qsa }): void => {
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

  const hasLiveTargets =
    discordTargets.length > 0 || discordMemberTargets.length > 0 || mcTargets.length > 0;
  if (!hasLiveTargets) return;

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
};
