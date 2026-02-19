import type { Qsa } from './dom';

const UNKNOWN_FALLBACK = 'unbekannt';
const LIVE_ERROR_VALUE = 'n/v';
const LIVE_ERROR_HINT = 'Status gerade nicht verfuegbar.';
const LIVE_CACHE_PREFIX = 'mg:live-counter:v1:';
const LIVE_CACHE_TTL_MS = 180_000;
const LIVE_FETCH_TIMEOUT_MS = 6_500;
const LIVE_IDLE_TIMEOUT_MS = 1_600;
const LIVE_IDLE_FALLBACK_DELAY_MS = 320;

type LiveCounterKey = 'discord-online' | 'discord-members' | 'mc-online';
type LiveCounterState = 'loading' | 'ok' | 'empty' | 'error' | 'stale';
type LiveCounterStoredKind = 'ok' | 'empty';
type LiveTileKey = 'discord-online' | 'mc-online';

interface DiscordWidgetResponse {
  presence_count?: number;
}

interface DiscordInviteResponse {
  approximate_member_count?: number;
}

interface MinecraftStatusResponse {
  online?: boolean;
  players?: {
    online?: number;
  };
}

interface LiveCounterCacheEntry {
  value: string;
  timestamp: number;
  kind?: LiveCounterStoredKind;
}

interface LiveCounterCacheSnapshot {
  value: string;
  timestamp: number;
  kind: LiveCounterStoredKind;
  ageMs: number;
}

interface LiveCounterFetchValue {
  value: string;
  kind: LiveCounterStoredKind;
}

interface LiveTileRefs {
  roots: HTMLElement[];
  notes: HTMLElement[];
  actions: HTMLElement[];
  retries: HTMLButtonElement[];
}

interface CounterDefinition {
  key: LiveCounterKey;
  targets: HTMLElement[];
  fetcher: () => Promise<LiveCounterFetchValue | null>;
  format?: (value: string) => string;
  errorValue?: string;
}

export const initLiveCounters = ({ config, qsa }: { config: BrowserAppConfig; qsa: Qsa }): void => {
  const formatInt = (value: unknown): string => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('de-DE') : String(value);
  };

  const toCounterNumber = (value: unknown): number | null => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (n < 0) return null;
    return Math.floor(n);
  };

  const formatLastUpdated = (timestamp: number): string => {
    const time = new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Zuletzt aktualisiert ${time} Uhr`;
  };

  const readCounterCache = (key: LiveCounterKey): LiveCounterCacheSnapshot | null => {
    try {
      const raw = localStorage.getItem(`${LIVE_CACHE_PREFIX}${key}`);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as LiveCounterCacheEntry;
      if (typeof parsed?.value !== 'string') return null;
      if (typeof parsed?.timestamp !== 'number') return null;

      const ageMs = Math.max(0, Date.now() - parsed.timestamp);
      const kind: LiveCounterStoredKind = parsed.kind === 'empty' ? 'empty' : 'ok';

      return {
        value: parsed.value,
        timestamp: parsed.timestamp,
        kind,
        ageMs,
      };
    } catch {
      return null;
    }
  };

  const readFreshCounterCache = (key: LiveCounterKey): LiveCounterCacheSnapshot | null => {
    const cache = readCounterCache(key);
    if (!cache) return null;
    if (cache.ageMs > LIVE_CACHE_TTL_MS) return null;
    return cache;
  };

  const readStaleCounterCache = (key: LiveCounterKey): LiveCounterCacheSnapshot | null => {
    const cache = readCounterCache(key);
    if (!cache) return null;
    if (cache.ageMs <= LIVE_CACHE_TTL_MS) return null;
    return cache;
  };

  const writeCounterCache = (
    key: LiveCounterKey,
    snapshot: { value: string; kind: LiveCounterStoredKind; timestamp: number },
  ): void => {
    try {
      const payload: LiveCounterCacheEntry = {
        value: snapshot.value,
        timestamp: snapshot.timestamp,
        kind: snapshot.kind,
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

  const fetchDiscordOnlineUsers = async (): Promise<LiveCounterFetchValue | null> => {
    try {
      const guildId = config.discordGuildId;
      if (!guildId) return null;

      const apiWidgetUrl = `https://discord.com/api/guilds/${guildId}/widget.json`;
      const data = await fetchJsonWithTimeout<DiscordWidgetResponse>(apiWidgetUrl);
      const count = toCounterNumber(data.presence_count);

      if (count == null) {
        return {
          value: '0',
          kind: 'empty',
        };
      }

      return {
        value: String(count),
        kind: count > 0 ? 'ok' : 'empty',
      };
    } catch {
      return null;
    }
  };

  const fetchDiscordMemberCount = async (): Promise<LiveCounterFetchValue | null> => {
    try {
      const code = config.discordInviteCode;
      if (!code) {
        return {
          value: UNKNOWN_FALLBACK,
          kind: 'ok',
        };
      }

      const apiUrl = `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`;
      const data = await fetchJsonWithTimeout<DiscordInviteResponse>(apiUrl);
      const count = toCounterNumber(data.approximate_member_count);

      if (count == null) {
        return {
          value: UNKNOWN_FALLBACK,
          kind: 'ok',
        };
      }

      return {
        value: String(count),
        kind: 'ok',
      };
    } catch {
      return null;
    }
  };

  const fetchMinecraftOnlinePlayers = async (): Promise<LiveCounterFetchValue | null> => {
    try {
      const ip = config.serverIp;
      if (!ip) return null;
      const apiUrl = `https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`;
      const data = await fetchJsonWithTimeout<MinecraftStatusResponse>(apiUrl);
      const count = toCounterNumber(data.players?.online);

      if (count != null) {
        return {
          value: String(count),
          kind: count > 0 ? 'ok' : 'empty',
        };
      }

      if (data.online === false) {
        return {
          value: '0',
          kind: 'empty',
        };
      }

      return {
        value: '0',
        kind: 'empty',
      };
    } catch (e) {
      console.warn('Minecraft Online-Count Fehler:', e);
      return null;
    }
  };

  const discordTargets = qsa<HTMLElement>('[data-discord-online]');
  const discordMemberTargets = qsa<HTMLElement>('[data-discord-members]');
  const mcTargets = qsa<HTMLElement>('[data-mc-online]');

  const liveTileRefs: Record<LiveTileKey, LiveTileRefs> = {
    'mc-online': {
      roots: qsa<HTMLElement>('[data-live-tile="mc-online"]'),
      notes: qsa<HTMLElement>('[data-live-note-for="mc-online"]'),
      actions: qsa<HTMLElement>('[data-live-actions-for="mc-online"]'),
      retries: qsa<HTMLButtonElement>('[data-live-retry="mc-online"]'),
    },
    'discord-online': {
      roots: qsa<HTMLElement>('[data-live-tile="discord-online"]'),
      notes: qsa<HTMLElement>('[data-live-note-for="discord-online"]'),
      actions: qsa<HTMLElement>('[data-live-actions-for="discord-online"]'),
      retries: qsa<HTMLButtonElement>('[data-live-retry="discord-online"]'),
    },
  };

  const counterDefinitions: CounterDefinition[] = [
    {
      key: 'discord-online',
      targets: discordTargets,
      fetcher: fetchDiscordOnlineUsers,
      errorValue: LIVE_ERROR_VALUE,
    },
    {
      key: 'discord-members',
      targets: discordMemberTargets,
      fetcher: fetchDiscordMemberCount,
      format: formatInt,
      errorValue: UNKNOWN_FALLBACK,
    },
    {
      key: 'mc-online',
      targets: mcTargets,
      fetcher: fetchMinecraftOnlinePlayers,
      errorValue: LIVE_ERROR_VALUE,
    },
  ];

  const counterDefinitionsByKey = new Map<LiveCounterKey, CounterDefinition>(
    counterDefinitions.map((definition) => [definition.key, definition]),
  );

  const hasLiveTargets = counterDefinitions.some((definition) => definition.targets.length > 0);
  if (!hasLiveTargets) return;

  const isLiveTileKey = (key: LiveCounterKey): key is LiveTileKey =>
    key === 'mc-online' || key === 'discord-online';

  const setTargetsState = (targets: HTMLElement[], state: LiveCounterState, text: string): void => {
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

  const setLiveTileRetryBusy = (key: LiveTileKey, isBusy: boolean): void => {
    const refs = liveTileRefs[key];
    refs.retries.forEach((button) => {
      button.disabled = isBusy;
      if (isBusy) {
        button.setAttribute('aria-busy', 'true');
      } else {
        button.removeAttribute('aria-busy');
      }
    });
  };

  const setLiveTileState = (
    key: LiveTileKey,
    state: LiveCounterState,
    updatedAt?: number,
  ): void => {
    const refs = liveTileRefs[key];
    if (!refs.roots.length && !refs.notes.length && !refs.actions.length) return;

    const updatedLabel = updatedAt != null ? formatLastUpdated(updatedAt) : null;
    let noteText = 'Status wird geladen...';

    if (state === 'ok') {
      noteText = updatedLabel ?? 'Zuletzt aktualisiert vor kurzem';
    } else if (state === 'empty') {
      noteText = updatedLabel ? `Gerade niemand online. ${updatedLabel}` : 'Gerade niemand online';
    } else if (state === 'error') {
      noteText = LIVE_ERROR_HINT;
    } else if (state === 'stale') {
      noteText = updatedLabel ? `${updatedLabel} (veraltet)` : 'Status ist veraltet';
    }

    refs.roots.forEach((root) => {
      root.dataset.liveState = state;
    });

    refs.notes.forEach((note) => {
      note.classList.add('mg-live-note');
      note.dataset.liveState = state;
      note.textContent = noteText;
    });

    const showActions = state === 'error' || state === 'stale';
    refs.actions.forEach((actions) => {
      actions.dataset.liveState = state;
      actions.classList.toggle('hidden', !showActions);
    });
  };

  const applyCounterState = (opts: {
    key: LiveCounterKey;
    targets: HTMLElement[];
    state: LiveCounterState;
    value: string;
    updatedAt?: number;
    errorValue?: string;
  }): void => {
    const { key, targets, state, value, updatedAt, errorValue = LIVE_ERROR_VALUE } = opts;

    if (state === 'loading') {
      setTargetsState(targets, 'loading', 'Laden...');
      if (isLiveTileKey(key)) setLiveTileState(key, 'loading');
      return;
    }

    if (state === 'error') {
      setTargetsState(targets, 'error', errorValue);
      if (isLiveTileKey(key)) setLiveTileState(key, 'error');
      return;
    }

    setTargetsState(targets, state, value);
    if (isLiveTileKey(key)) setLiveTileState(key, state, updatedAt);
  };

  const inFlightKeys = new Set<LiveCounterKey>();

  const updateCounter = async (definition: CounterDefinition): Promise<void> => {
    const { key, targets, fetcher, format, errorValue = LIVE_ERROR_VALUE } = definition;
    if (!targets.length) return;
    if (inFlightKeys.has(key)) return;

    inFlightKeys.add(key);
    if (isLiveTileKey(key)) setLiveTileRetryBusy(key, true);

    try {
      const latest = await fetcher();
      if (latest != null) {
        const now = Date.now();
        writeCounterCache(key, {
          value: latest.value,
          kind: latest.kind,
          timestamp: now,
        });

        const value = format ? format(latest.value) : latest.value;
        const state: LiveCounterState = latest.kind === 'empty' ? 'empty' : 'ok';
        applyCounterState({
          key,
          targets,
          state,
          value,
          updatedAt: now,
          errorValue,
        });
        return;
      }

      const freshCache = readFreshCounterCache(key);
      if (freshCache != null) {
        const value = format ? format(freshCache.value) : freshCache.value;
        const state: LiveCounterState = freshCache.kind === 'empty' ? 'empty' : 'ok';
        applyCounterState({
          key,
          targets,
          state,
          value,
          updatedAt: freshCache.timestamp,
          errorValue,
        });
        return;
      }

      const staleCache = readStaleCounterCache(key);
      if (staleCache != null) {
        const value = format ? format(staleCache.value) : staleCache.value;
        applyCounterState({
          key,
          targets,
          state: 'stale',
          value,
          updatedAt: staleCache.timestamp,
          errorValue,
        });
        return;
      }

      applyCounterState({
        key,
        targets,
        state: 'error',
        value: errorValue,
        errorValue,
      });
    } finally {
      inFlightKeys.delete(key);
      if (isLiveTileKey(key)) setLiveTileRetryBusy(key, false);
    }
  };

  const primeCounter = (definition: CounterDefinition): void => {
    const { key, targets, format, errorValue = LIVE_ERROR_VALUE } = definition;
    if (!targets.length) return;

    const freshCache = readFreshCounterCache(key);
    if (freshCache != null) {
      const value = format ? format(freshCache.value) : freshCache.value;
      const state: LiveCounterState = freshCache.kind === 'empty' ? 'empty' : 'ok';
      applyCounterState({
        key,
        targets,
        state,
        value,
        updatedAt: freshCache.timestamp,
        errorValue,
      });
      return;
    }

    applyCounterState({
      key,
      targets,
      state: 'loading',
      value: 'Laden...',
      errorValue,
    });
  };

  const refreshCounters = (): void => {
    void Promise.all(counterDefinitions.map((definition) => updateCounter(definition)));
  };

  (['mc-online', 'discord-online'] as const).forEach((key) => {
    const definition = counterDefinitionsByKey.get(key);
    if (!definition) return;

    liveTileRefs[key].retries.forEach((button) => {
      button.addEventListener('click', () => {
        applyCounterState({
          key,
          targets: definition.targets,
          state: 'loading',
          value: 'Laden...',
          errorValue: definition.errorValue,
        });
        void updateCounter(definition);
      });
    });
  });

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

  counterDefinitions.forEach((definition) => {
    primeCounter(definition);
  });

  runWhenIdleOrInteracted(() => {
    refreshCounters();
  });
};
