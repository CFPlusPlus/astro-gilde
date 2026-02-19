import type { Qsa } from './dom';
import {
  LIVE_WIDGET_THRESHOLDS,
  type LiveDataError,
  type LiveDataState,
  type LiveDataStatus,
  type LiveDataThresholds,
} from '../../lib/live/types';

const UNKNOWN_FALLBACK = 'unbekannt';
const LIVE_ERROR_VALUE = 'n/v';
const LIVE_ERROR_HINT = 'Status gerade nicht verfuegbar.';
const LIVE_CACHE_PREFIX = 'mg:live-counter:v2:';
const LIVE_FETCH_TIMEOUT_MS = 6_500;
const LIVE_IDLE_TIMEOUT_MS = 1_600;
const LIVE_IDLE_FALLBACK_DELAY_MS = 320;

type LiveCounterKey = 'discord-online' | 'discord-members' | 'mc-online';
type LiveCounterCachedStatus = Extract<LiveDataStatus, 'ok' | 'empty'>;
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

interface HttpStatusError extends Error {
  status: number;
  retryAfterMs?: number;
}

interface LiveCounterCacheEntry {
  data?: string;
  value?: string;
  status?: LiveCounterCachedStatus;
  kind?: LiveCounterCachedStatus;
  updatedAt?: number;
  fetchedAt?: number;
  timestamp?: number;
}

interface LiveCounterCacheSnapshot {
  state: LiveDataState<string> & {
    status: LiveCounterCachedStatus;
    data: string;
    updatedAt: number;
    fetchedAt: number;
  };
  ageMs: number;
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
  fetcher: () => Promise<LiveDataState<string>>;
  thresholds: LiveDataThresholds;
  format?: (value: string) => string;
  errorValue?: string;
}

const isHttpStatusError = (error: unknown): error is HttpStatusError => {
  return error instanceof Error && typeof (error as Partial<HttpStatusError>).status === 'number';
};

const toRetryAfterMs = (headerValue: string | null): number | undefined => {
  if (!headerValue) return undefined;

  const asSeconds = Number(headerValue);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.floor(asSeconds * 1_000);
  }

  const asDate = Date.parse(headerValue);
  if (Number.isNaN(asDate)) return undefined;

  return Math.max(0, asDate - Date.now());
};

const toLiveError = (error: unknown): LiveDataError => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      kind: 'timeout',
      message: 'Zeitlimit der Statusabfrage erreicht.',
    };
  }

  if (isHttpStatusError(error)) {
    if (error.status === 429) {
      return {
        kind: 'rate_limit',
        message: 'Zu viele Anfragen an die Datenquelle.',
        retryAfterMs: error.retryAfterMs,
      };
    }

    if (error.status >= 400 && error.status < 500) {
      return {
        kind: 'invalid',
        message: `Ungueltige Antwort (HTTP ${error.status}).`,
      };
    }

    return {
      kind: 'network',
      message: `Datenquelle nicht erreichbar (HTTP ${error.status}).`,
    };
  }

  if (error instanceof Error) {
    if (/Failed to fetch|NetworkError/i.test(error.message)) {
      return {
        kind: 'network',
        message: 'Netzwerkfehler beim Laden der Live-Daten.',
      };
    }

    return {
      kind: 'unknown',
      message: error.message,
    };
  }

  return {
    kind: 'unknown',
    message: 'Unbekannter Fehler beim Laden der Live-Daten.',
  };
};

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

  const formatErrorHint = (error?: LiveDataError): string => {
    if (!error) return LIVE_ERROR_HINT;

    if (error.kind === 'timeout') {
      return 'Statusabfrage hat zu lange gedauert.';
    }

    if (error.kind === 'rate_limit') {
      if (typeof error.retryAfterMs === 'number' && error.retryAfterMs > 0) {
        const seconds = Math.max(1, Math.ceil(error.retryAfterMs / 1_000));
        return `Zu viele Anfragen. Bitte in etwa ${seconds}s erneut versuchen.`;
      }
      return 'Zu viele Anfragen. Bitte spaeter erneut versuchen.';
    }

    if (error.kind === 'network') {
      return 'Netzwerkproblem bei der Statusabfrage.';
    }

    if (error.kind === 'invalid') {
      return 'Statusdaten waren ungueltig.';
    }

    return LIVE_ERROR_HINT;
  };

  const parseCacheStatus = (entry: LiveCounterCacheEntry): LiveCounterCachedStatus => {
    if (entry.status === 'empty' || entry.kind === 'empty') return 'empty';
    return 'ok';
  };

  const parseCacheData = (entry: LiveCounterCacheEntry): string | null => {
    if (typeof entry.data === 'string') return entry.data;
    if (typeof entry.value === 'string') return entry.value;
    return null;
  };

  const parseCacheTimestamp = (
    entry: LiveCounterCacheEntry,
    preferred: 'updatedAt' | 'fetchedAt',
  ): number | null => {
    const fromPreferred = entry[preferred];
    if (typeof fromPreferred === 'number') return fromPreferred;
    if (typeof entry.timestamp === 'number') return entry.timestamp;
    return null;
  };

  const readCounterCache = (key: LiveCounterKey): LiveCounterCacheSnapshot | null => {
    try {
      const raw = localStorage.getItem(`${LIVE_CACHE_PREFIX}${key}`);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as LiveCounterCacheEntry;
      const data = parseCacheData(parsed);
      const updatedAt = parseCacheTimestamp(parsed, 'updatedAt');
      const fetchedAt = parseCacheTimestamp(parsed, 'fetchedAt');
      if (data == null || updatedAt == null || fetchedAt == null) return null;

      const status = parseCacheStatus(parsed);
      const ageMs = Math.max(0, Date.now() - updatedAt);

      return {
        state: {
          status,
          data,
          updatedAt,
          fetchedAt,
        },
        ageMs,
      };
    } catch {
      return null;
    }
  };

  const readFreshCounterCache = (
    key: LiveCounterKey,
    thresholds: LiveDataThresholds,
  ): LiveCounterCacheSnapshot | null => {
    const cache = readCounterCache(key);
    if (!cache) return null;
    if (cache.ageMs > thresholds.staleAfterMs) return null;
    return cache;
  };

  const readStaleCounterCache = (
    key: LiveCounterKey,
    thresholds: LiveDataThresholds,
  ): LiveCounterCacheSnapshot | null => {
    const cache = readCounterCache(key);
    if (!cache) return null;
    if (cache.ageMs <= thresholds.staleAfterMs) return null;
    if (cache.ageMs > thresholds.maxCacheAgeMs) return null;
    return cache;
  };

  const writeCounterCache = (
    key: LiveCounterKey,
    state: LiveDataState<string> & {
      status: LiveCounterCachedStatus;
      data: string;
      updatedAt: number;
      fetchedAt: number;
    },
  ): void => {
    try {
      const payload: LiveCounterCacheEntry = {
        status: state.status,
        data: state.data,
        updatedAt: state.updatedAt,
        fetchedAt: state.fetchedAt,
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
        const httpError = new Error(`HTTP ${response.status}`) as HttpStatusError;
        httpError.status = response.status;
        httpError.retryAfterMs = toRetryAfterMs(response.headers.get('retry-after'));
        throw httpError;
      }

      return (await response.json()) as T;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const fetchDiscordOnlineUsers = async (): Promise<LiveDataState<string>> => {
    const fetchedAt = Date.now();

    try {
      const guildId = config.discordGuildId;
      if (!guildId) {
        return {
          status: 'error',
          fetchedAt,
          error: {
            kind: 'invalid',
            message: 'Discord Guild-ID fehlt.',
          },
        };
      }

      const apiWidgetUrl = `https://discord.com/api/guilds/${guildId}/widget.json`;
      const data = await fetchJsonWithTimeout<DiscordWidgetResponse>(apiWidgetUrl);
      const count = toCounterNumber(data.presence_count);

      if (count == null) {
        return {
          status: 'empty',
          data: '0',
          updatedAt: fetchedAt,
          fetchedAt,
        };
      }

      return {
        status: count > 0 ? 'ok' : 'empty',
        data: String(count),
        updatedAt: fetchedAt,
        fetchedAt,
      };
    } catch (error) {
      return {
        status: 'error',
        fetchedAt,
        error: toLiveError(error),
      };
    }
  };

  const fetchDiscordMemberCount = async (): Promise<LiveDataState<string>> => {
    const fetchedAt = Date.now();

    try {
      const code = config.discordInviteCode;
      if (!code) {
        return {
          status: 'ok',
          data: UNKNOWN_FALLBACK,
          updatedAt: fetchedAt,
          fetchedAt,
        };
      }

      const apiUrl = `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`;
      const data = await fetchJsonWithTimeout<DiscordInviteResponse>(apiUrl);
      const count = toCounterNumber(data.approximate_member_count);

      if (count == null) {
        return {
          status: 'ok',
          data: UNKNOWN_FALLBACK,
          updatedAt: fetchedAt,
          fetchedAt,
        };
      }

      return {
        status: 'ok',
        data: String(count),
        updatedAt: fetchedAt,
        fetchedAt,
      };
    } catch (error) {
      return {
        status: 'error',
        fetchedAt,
        error: toLiveError(error),
      };
    }
  };

  const fetchMinecraftOnlinePlayers = async (): Promise<LiveDataState<string>> => {
    const fetchedAt = Date.now();

    try {
      const ip = config.serverIp;
      if (!ip) {
        return {
          status: 'error',
          fetchedAt,
          error: {
            kind: 'invalid',
            message: 'Server-IP fehlt.',
          },
        };
      }

      const apiUrl = `https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`;
      const data = await fetchJsonWithTimeout<MinecraftStatusResponse>(apiUrl);
      const count = toCounterNumber(data.players?.online);

      if (count != null) {
        return {
          status: count > 0 ? 'ok' : 'empty',
          data: String(count),
          updatedAt: fetchedAt,
          fetchedAt,
        };
      }

      if (data.online === false) {
        return {
          status: 'empty',
          data: '0',
          updatedAt: fetchedAt,
          fetchedAt,
        };
      }

      return {
        status: 'empty',
        data: '0',
        updatedAt: fetchedAt,
        fetchedAt,
      };
    } catch (error) {
      console.warn('Minecraft Online-Count Fehler:', error);
      return {
        status: 'error',
        fetchedAt,
        error: toLiveError(error),
      };
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
      thresholds: LIVE_WIDGET_THRESHOLDS['discord-online'],
      errorValue: LIVE_ERROR_VALUE,
    },
    {
      key: 'discord-members',
      targets: discordMemberTargets,
      fetcher: fetchDiscordMemberCount,
      thresholds: LIVE_WIDGET_THRESHOLDS['discord-members'],
      format: formatInt,
      errorValue: UNKNOWN_FALLBACK,
    },
    {
      key: 'mc-online',
      targets: mcTargets,
      fetcher: fetchMinecraftOnlinePlayers,
      thresholds: LIVE_WIDGET_THRESHOLDS['mc-online'],
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

  const setTargetsState = (targets: HTMLElement[], state: LiveDataStatus, text: string): void => {
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

  const setLiveTileState = (key: LiveTileKey, state: LiveDataState<string>): void => {
    const refs = liveTileRefs[key];
    if (!refs.roots.length && !refs.notes.length && !refs.actions.length) return;

    const updatedLabel = state.updatedAt != null ? formatLastUpdated(state.updatedAt) : null;
    let noteText = 'Status wird geladen...';

    if (state.status === 'ok') {
      noteText = updatedLabel ?? 'Zuletzt aktualisiert vor kurzem';
    } else if (state.status === 'empty') {
      noteText = updatedLabel ? `Gerade niemand online. ${updatedLabel}` : 'Gerade niemand online';
    } else if (state.status === 'error') {
      noteText = formatErrorHint(state.error);
    } else if (state.status === 'stale') {
      noteText = updatedLabel ? `${updatedLabel} (veraltet)` : 'Status ist veraltet';
    }

    refs.roots.forEach((root) => {
      root.dataset.liveState = state.status;
    });

    refs.notes.forEach((note) => {
      note.classList.add('mg-live-note');
      note.dataset.liveState = state.status;
      note.textContent = noteText;
    });

    const showActions = state.status === 'error' || state.status === 'stale';
    refs.actions.forEach((actions) => {
      actions.dataset.liveState = state.status;
      actions.classList.toggle('hidden', !showActions);
    });
  };

  const applyCounterState = (opts: {
    key: LiveCounterKey;
    targets: HTMLElement[];
    state: LiveDataState<string>;
    format?: (value: string) => string;
    errorValue?: string;
  }): void => {
    const { key, targets, state, format, errorValue = LIVE_ERROR_VALUE } = opts;

    if (state.status === 'loading') {
      setTargetsState(targets, 'loading', 'Laden...');
      if (isLiveTileKey(key)) setLiveTileState(key, state);
      return;
    }

    if (state.status === 'error') {
      setTargetsState(targets, 'error', errorValue);
      if (isLiveTileKey(key)) setLiveTileState(key, state);
      return;
    }

    const resolvedValue = state.data ?? (state.status === 'empty' ? '0' : errorValue);
    const formattedValue = format ? format(resolvedValue) : resolvedValue;

    setTargetsState(targets, state.status, formattedValue);
    if (isLiveTileKey(key)) setLiveTileState(key, state);
  };

  const inFlightKeys = new Set<LiveCounterKey>();

  const updateCounter = async (definition: CounterDefinition): Promise<void> => {
    const { key, targets, fetcher, format, errorValue = LIVE_ERROR_VALUE, thresholds } = definition;
    if (!targets.length) return;
    if (inFlightKeys.has(key)) return;

    inFlightKeys.add(key);
    if (isLiveTileKey(key)) setLiveTileRetryBusy(key, true);

    try {
      const latest = await fetcher();

      if (
        (latest.status === 'ok' || latest.status === 'empty') &&
        typeof latest.data === 'string'
      ) {
        const fetchedAt = latest.fetchedAt ?? Date.now();
        const updatedAt = latest.updatedAt ?? fetchedAt;

        const successState: LiveDataState<string> & {
          status: LiveCounterCachedStatus;
          data: string;
          updatedAt: number;
          fetchedAt: number;
        } = {
          ...latest,
          status: latest.status,
          data: latest.data,
          updatedAt,
          fetchedAt,
        };

        writeCounterCache(key, successState);
        applyCounterState({
          key,
          targets,
          state: successState,
          format,
          errorValue,
        });
        return;
      }

      const freshCache = readFreshCounterCache(key, thresholds);
      if (freshCache != null) {
        applyCounterState({
          key,
          targets,
          state: freshCache.state,
          format,
          errorValue,
        });
        return;
      }

      const staleCache = readStaleCounterCache(key, thresholds);
      if (staleCache != null) {
        applyCounterState({
          key,
          targets,
          state: {
            status: 'stale',
            data: staleCache.state.data,
            updatedAt: staleCache.state.updatedAt,
            fetchedAt: latest.fetchedAt ?? staleCache.state.fetchedAt,
            error: latest.error,
          },
          format,
          errorValue,
        });
        return;
      }

      if (latest.status === 'error') {
        applyCounterState({
          key,
          targets,
          state: latest,
          format,
          errorValue,
        });
        return;
      }

      applyCounterState({
        key,
        targets,
        state: {
          status: 'error',
          error: {
            kind: 'unknown',
          },
        },
        format,
        errorValue,
      });
    } finally {
      inFlightKeys.delete(key);
      if (isLiveTileKey(key)) setLiveTileRetryBusy(key, false);
    }
  };

  const primeCounter = (definition: CounterDefinition): void => {
    const { key, targets, format, errorValue = LIVE_ERROR_VALUE, thresholds } = definition;
    if (!targets.length) return;

    const freshCache = readFreshCounterCache(key, thresholds);
    if (freshCache != null) {
      applyCounterState({
        key,
        targets,
        state: freshCache.state,
        format,
        errorValue,
      });
      return;
    }

    applyCounterState({
      key,
      targets,
      state: {
        status: 'loading',
        fetchedAt: Date.now(),
      },
      format,
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
          state: {
            status: 'loading',
            fetchedAt: Date.now(),
          },
          format: definition.format,
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
