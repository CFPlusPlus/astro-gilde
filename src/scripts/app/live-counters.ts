import type { Qsa } from './dom';
import {
  LIVE_WIDGET_THRESHOLDS,
  type LiveDataError,
  type LiveDataState,
  type LiveDataStatus,
  type LiveDataThresholds,
} from '../../lib/live/types';
import { fetchJson, type FetchJsonError } from '../../lib/live/fetchJson';
import { getLiveResource } from '../../lib/live/cache';
import {
  formatLastUpdatedAbsolute,
  formatLastUpdatedLabel,
  resolveLastUpdatedTimestamp,
} from '../../lib/live/lastUpdated';

const UNKNOWN_FALLBACK = 'unbekannt';
const LIVE_ERROR_VALUE = 'n/v';
const LIVE_LOADING_HINT = 'Lade Live-Daten ...';
const LIVE_ERROR_HINT = 'Live-Status gerade nicht verfügbar';
const LIVE_STALE_SUFFIX = 'Anzeige evtl. veraltet';
const LIVE_CACHE_PREFIX = 'mg:live-counter:v2:';
const LIVE_FETCH_TIMEOUT_MS = 6_500;
const LIVE_IDLE_TIMEOUT_MS = 1_600;
const LIVE_IDLE_FALLBACK_DELAY_MS = 320;
const LIVE_RELATIVE_REFRESH_MS = 30_000;
const LIVE_AUTO_RETRY_BASE_DELAY_MS = 1_000;
const LIVE_AUTO_RETRY_MAX_ATTEMPTS = 1;
const LIVE_RATE_LIMIT_FALLBACK_MS = 30_000;
const LIVE_MANUAL_REVALIDATE_DEBOUNCE_MS = 2_000;
const LIVE_MIN_REVALIDATE_INTERVAL_MS = 15_000;

type LiveCounterKey = 'discord-online' | 'discord-members' | 'mc-online';
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

interface CounterRevalidateOptions {
  applyInitialState?: boolean;
  retryAttempt?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isDiscordWidgetResponse = (value: unknown): value is DiscordWidgetResponse => isRecord(value);

const isDiscordInviteResponse = (value: unknown): value is DiscordInviteResponse => isRecord(value);

const isMinecraftStatusResponse = (value: unknown): value is MinecraftStatusResponse =>
  isRecord(value);

const toLiveError = (error: FetchJsonError): LiveDataError => ({
  kind: error.kind,
  message: error.message,
  retryAfterMs: error.retryAfterMs,
});

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

  const toRetryAfterMs = (error?: LiveDataError): number => {
    if (error?.kind !== 'rate_limit') return 0;
    if (typeof error.retryAfterMs === 'number' && error.retryAfterMs > 0) {
      return error.retryAfterMs;
    }
    return LIVE_RATE_LIMIT_FALLBACK_MS;
  };

  const formatErrorHint = (
    state: LiveDataState<string>,
    tileKey: LiveTileKey | undefined,
    now: number,
  ): string => {
    if (state.error?.kind !== 'rate_limit') return LIVE_ERROR_HINT;

    const remainingFromWindow = tileKey ? getRateLimitRemainingMs(tileKey, now) : 0;
    const retryAfterMs = toRetryAfterMs(state.error);
    const resolvedFetchedAt = typeof state.fetchedAt === 'number' ? state.fetchedAt : now;
    const remainingFromState = Math.max(0, resolvedFetchedAt + retryAfterMs - now);
    const remainingMs = Math.max(remainingFromWindow, remainingFromState);

    if (remainingMs <= 0) return 'Zu viele Anfragen - bitte spaeter erneut laden';

    const seconds = Math.max(1, Math.ceil(remainingMs / 1_000));
    return `Zu viele Anfragen - erneut in ${seconds}s`;
  };

  const resolveLiveNote = (
    state: LiveDataState<string>,
    tileKey?: LiveTileKey,
    now = Date.now(),
  ): { text: string; tooltip?: string } => {
    const timestamp = resolveLastUpdatedTimestamp(state);
    const lastUpdatedLabel = timestamp != null ? formatLastUpdatedLabel(timestamp, now) : null;
    const tooltip = timestamp != null ? formatLastUpdatedAbsolute(timestamp) : undefined;

    if (state.status === 'loading') {
      return {
        text: LIVE_LOADING_HINT,
      };
    }

    if (state.status === 'error') {
      return {
        text: formatErrorHint(state, tileKey, now),
      };
    }

    if (state.status === 'stale') {
      if (lastUpdatedLabel) {
        return {
          text: `${lastUpdatedLabel} · ${LIVE_STALE_SUFFIX}`,
          tooltip,
        };
      }
      return {
        text: `Zuletzt aktualisiert · ${LIVE_STALE_SUFFIX}`,
      };
    }

    if (state.status === 'empty') {
      if (lastUpdatedLabel) {
        return {
          text: `${lastUpdatedLabel} · Gerade niemand online`,
          tooltip,
        };
      }
      return {
        text: 'Gerade niemand online',
      };
    }

    if (lastUpdatedLabel) {
      return {
        text: lastUpdatedLabel,
        tooltip,
      };
    }

    return {
      text: 'Zuletzt aktualisiert',
    };
  };

  const fetchDiscordOnlineUsers = async (): Promise<LiveDataState<string>> => {
    const guildId = config.discordGuildId;
    if (!guildId) {
      const fetchedAt = Date.now();
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
    const result = await fetchJson<DiscordWidgetResponse>(apiWidgetUrl, {
      cache: 'no-store',
      timeoutMs: LIVE_FETCH_TIMEOUT_MS,
      requiredKeys: ['presence_count'],
      validate: isDiscordWidgetResponse,
    });

    if (!result.ok) {
      return {
        status: 'error',
        fetchedAt: result.fetchedAt,
        error: toLiveError(result.error),
      };
    }

    const count = toCounterNumber(result.data.presence_count);
    if (count == null) {
      return {
        status: 'empty',
        data: '0',
        updatedAt: result.fetchedAt,
        fetchedAt: result.fetchedAt,
      };
    }

    return {
      status: count > 0 ? 'ok' : 'empty',
      data: String(count),
      updatedAt: result.fetchedAt,
      fetchedAt: result.fetchedAt,
    };
  };

  const fetchDiscordMemberCount = async (): Promise<LiveDataState<string>> => {
    const code = config.discordInviteCode;
    if (!code) {
      const fetchedAt = Date.now();
      return {
        status: 'ok',
        data: UNKNOWN_FALLBACK,
        updatedAt: fetchedAt,
        fetchedAt,
      };
    }

    const apiUrl = `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`;
    const result = await fetchJson<DiscordInviteResponse>(apiUrl, {
      cache: 'no-store',
      timeoutMs: LIVE_FETCH_TIMEOUT_MS,
      validate: isDiscordInviteResponse,
    });

    if (!result.ok) {
      return {
        status: 'error',
        fetchedAt: result.fetchedAt,
        error: toLiveError(result.error),
      };
    }

    const count = toCounterNumber(result.data.approximate_member_count);
    if (count == null) {
      return {
        status: 'ok',
        data: UNKNOWN_FALLBACK,
        updatedAt: result.fetchedAt,
        fetchedAt: result.fetchedAt,
      };
    }

    return {
      status: 'ok',
      data: String(count),
      updatedAt: result.fetchedAt,
      fetchedAt: result.fetchedAt,
    };
  };

  const fetchMinecraftOnlinePlayers = async (): Promise<LiveDataState<string>> => {
    const ip = config.serverIp;
    if (!ip) {
      const fetchedAt = Date.now();
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
    const result = await fetchJson<MinecraftStatusResponse>(apiUrl, {
      cache: 'no-store',
      timeoutMs: LIVE_FETCH_TIMEOUT_MS,
      requiredKeys: ['online'],
      validate: isMinecraftStatusResponse,
    });

    if (!result.ok) {
      return {
        status: 'error',
        fetchedAt: result.fetchedAt,
        error: toLiveError(result.error),
      };
    }

    const count = toCounterNumber(result.data.players?.online);
    if (count != null) {
      return {
        status: count > 0 ? 'ok' : 'empty',
        data: String(count),
        updatedAt: result.fetchedAt,
        fetchedAt: result.fetchedAt,
      };
    }

    if (result.data.online === false) {
      return {
        status: 'empty',
        data: '0',
        updatedAt: result.fetchedAt,
        fetchedAt: result.fetchedAt,
      };
    }

    return {
      status: 'empty',
      data: '0',
      updatedAt: result.fetchedAt,
      fetchedAt: result.fetchedAt,
    };
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
  const liveTileStateByKey = new Map<LiveTileKey, LiveDataState<string>>();
  const liveTileRetryBusyByKey = new Map<LiveTileKey, boolean>();
  const rateLimitUntilByKey = new Map<LiveCounterKey, number>();
  const manualRevalidateUntilByKey = new Map<LiveTileKey, number>();
  const autoRetryTimerByKey = new Map<LiveCounterKey, number>();

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

  const getRateLimitRemainingMs = (key: LiveCounterKey, now = Date.now()): number => {
    const retryUntil = rateLimitUntilByKey.get(key);
    if (typeof retryUntil !== 'number') return 0;

    const remainingMs = retryUntil - now;
    if (remainingMs <= 0) {
      rateLimitUntilByKey.delete(key);
      return 0;
    }

    return remainingMs;
  };

  const getManualRevalidateRemainingMs = (key: LiveTileKey, now = Date.now()): number => {
    const retryUntil = manualRevalidateUntilByKey.get(key);
    if (typeof retryUntil !== 'number') return 0;

    const remainingMs = retryUntil - now;
    if (remainingMs <= 0) {
      manualRevalidateUntilByKey.delete(key);
      return 0;
    }

    return remainingMs;
  };

  const syncLiveTileRetryState = (key: LiveTileKey, now = Date.now()): void => {
    const refs = liveTileRefs[key];
    const isBusy = liveTileRetryBusyByKey.get(key) === true;
    const hasRateLimitCooldown = getRateLimitRemainingMs(key, now) > 0;
    const hasManualDebounce = getManualRevalidateRemainingMs(key, now) > 0;
    const isDisabled = isBusy || hasRateLimitCooldown || hasManualDebounce;

    refs.retries.forEach((button) => {
      button.disabled = isDisabled;
      if (isBusy) {
        button.setAttribute('aria-busy', 'true');
      } else {
        button.removeAttribute('aria-busy');
      }
    });
  };

  const setLiveTileRetryBusy = (key: LiveTileKey, isBusy: boolean): void => {
    liveTileRetryBusyByKey.set(key, isBusy);
    syncLiveTileRetryState(key);
  };

  const updateRateLimitWindow = (
    key: LiveCounterKey,
    state: LiveDataState<string>,
    now = Date.now(),
  ): void => {
    if (state.error?.kind !== 'rate_limit') {
      rateLimitUntilByKey.delete(key);
      return;
    }

    const retryAfterMs = toRetryAfterMs(state.error);
    if (retryAfterMs <= 0) {
      rateLimitUntilByKey.delete(key);
      return;
    }

    rateLimitUntilByKey.set(key, now + retryAfterMs);
  };

  const clearAutoRetryTimer = (key: LiveCounterKey): void => {
    const timer = autoRetryTimerByKey.get(key);
    if (typeof timer === 'number') {
      window.clearTimeout(timer);
      autoRetryTimerByKey.delete(key);
    }
  };

  const setLiveTileState = (key: LiveTileKey, state: LiveDataState<string>): void => {
    const refs = liveTileRefs[key];
    if (!refs.roots.length && !refs.notes.length && !refs.actions.length) return;
    liveTileStateByKey.set(key, state);
    const note = resolveLiveNote(state, key);

    refs.roots.forEach((root) => {
      root.dataset.liveState = state.status;
    });

    refs.notes.forEach((noteEl) => {
      noteEl.classList.add('mg-live-note', 'mg-live-state-note');
      noteEl.dataset.liveState = state.status;
      noteEl.textContent = note.text;
      noteEl.setAttribute('aria-label', note.text);

      if (note.tooltip) {
        noteEl.title = note.tooltip;
        noteEl.setAttribute('aria-label', `${note.text}. ${note.tooltip}`);
      } else {
        noteEl.removeAttribute('title');
      }
    });

    const showActions = state.status === 'error' || state.status === 'stale';
    refs.actions.forEach((actions) => {
      actions.dataset.liveState = state.status;
      actions.dataset.visible = showActions ? 'true' : 'false';
      actions.setAttribute('aria-hidden', showActions ? 'false' : 'true');
    });

    syncLiveTileRetryState(key);
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
      setTargetsState(targets, 'loading', LIVE_LOADING_HINT);
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

  const updateCounter = async (
    definition: CounterDefinition,
    options?: CounterRevalidateOptions,
  ): Promise<void> => {
    const { key, targets, fetcher, format, errorValue = LIVE_ERROR_VALUE, thresholds } = definition;
    if (!targets.length) return;
    if (inFlightKeys.has(key)) return;
    if (getRateLimitRemainingMs(key) > 0) {
      if (isLiveTileKey(key)) syncLiveTileRetryState(key);
      return;
    }

    clearAutoRetryTimer(key);
    inFlightKeys.add(key);
    if (isLiveTileKey(key)) setLiveTileRetryBusy(key, true);

    try {
      const resource = getLiveResource(key, fetcher, {
        staleAfterMs: thresholds.staleAfterMs,
        maxCacheAgeMs: thresholds.maxCacheAgeMs,
        cachePrefix: LIVE_CACHE_PREFIX,
        persist: true,
        minRevalidateIntervalMs: LIVE_MIN_REVALIDATE_INTERVAL_MS,
      });

      if (options?.applyInitialState !== false) {
        applyCounterState({
          key,
          targets,
          state: resource.state,
          format,
          errorValue,
        });
      }

      if (!resource.revalidate) return;
      const latest = await resource.revalidate;
      updateRateLimitWindow(key, latest);

      applyCounterState({
        key,
        targets,
        state: latest,
        format,
        errorValue,
      });

      const retryAttempt = options?.retryAttempt ?? 0;
      const isAutoRetryCandidate =
        latest.error != null &&
        (latest.error.kind === 'network' || latest.error.kind === 'timeout') &&
        retryAttempt < LIVE_AUTO_RETRY_MAX_ATTEMPTS;

      if (isAutoRetryCandidate) {
        const retryDelayMs = LIVE_AUTO_RETRY_BASE_DELAY_MS * 2 ** retryAttempt;
        const timer = window.setTimeout(() => {
          autoRetryTimerByKey.delete(key);
          void updateCounter(definition, {
            applyInitialState: false,
            retryAttempt: retryAttempt + 1,
          });
        }, retryDelayMs);
        autoRetryTimerByKey.set(key, timer);
      }
    } finally {
      inFlightKeys.delete(key);
      if (isLiveTileKey(key)) setLiveTileRetryBusy(key, false);
    }
  };

  const primeCounter = (definition: CounterDefinition): void => {
    const { key, targets, format, errorValue = LIVE_ERROR_VALUE, thresholds } = definition;
    if (!targets.length) return;

    const resource = getLiveResource(key, definition.fetcher, {
      staleAfterMs: thresholds.staleAfterMs,
      maxCacheAgeMs: thresholds.maxCacheAgeMs,
      cachePrefix: LIVE_CACHE_PREFIX,
      persist: true,
      revalidate: false,
    });

    applyCounterState({
      key,
      targets,
      state: resource.state,
      format,
      errorValue,
    });
  };

  const revalidate = (key: LiveCounterKey, options?: { force?: boolean }): void => {
    const definition = counterDefinitionsByKey.get(key);
    if (!definition) return;

    if (isLiveTileKey(key) && options?.force) {
      const now = Date.now();
      if (getRateLimitRemainingMs(key, now) > 0) {
        syncLiveTileRetryState(key, now);
        refreshLiveTileNotes();
        return;
      }

      if (getManualRevalidateRemainingMs(key, now) > 0) {
        syncLiveTileRetryState(key, now);
        return;
      }

      manualRevalidateUntilByKey.set(key, now + LIVE_MANUAL_REVALIDATE_DEBOUNCE_MS);
      syncLiveTileRetryState(key, now);
      window.setTimeout(() => {
        syncLiveTileRetryState(key);
      }, LIVE_MANUAL_REVALIDATE_DEBOUNCE_MS + 40);

      applyCounterState({
        key,
        targets: definition.targets,
        state: {
          status: 'loading',
          fetchedAt: now,
        },
        format: definition.format,
        errorValue: definition.errorValue,
      });
    }

    void updateCounter(definition, {
      applyInitialState: false,
      retryAttempt: 0,
    });
  };

  const shouldRevalidateOnResume = (definition: CounterDefinition): boolean => {
    const resource = getLiveResource(definition.key, definition.fetcher, {
      staleAfterMs: definition.thresholds.staleAfterMs,
      maxCacheAgeMs: definition.thresholds.maxCacheAgeMs,
      cachePrefix: LIVE_CACHE_PREFIX,
      persist: true,
      revalidate: false,
    });

    return (
      resource.state.status === 'loading' ||
      resource.state.status === 'error' ||
      resource.state.status === 'stale'
    );
  };

  const refreshCounters = (options?: { onlyStale?: boolean }): void => {
    counterDefinitions.forEach((definition) => {
      if (options?.onlyStale && !shouldRevalidateOnResume(definition)) return;
      revalidate(definition.key);
    });
  };

  (['mc-online', 'discord-online'] as const).forEach((key) => {
    liveTileRefs[key].retries.forEach((button) => {
      button.addEventListener('click', () => {
        revalidate(key, { force: true });
      });
    });
  });

  const refreshLiveTileNotes = (): void => {
    (['mc-online', 'discord-online'] as const).forEach((key) => {
      const state = liveTileStateByKey.get(key);
      if (!state) return;
      setLiveTileState(key, state);
    });
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

  counterDefinitions.forEach((definition) => {
    primeCounter(definition);
  });

  const hasLiveTileTargets = (['mc-online', 'discord-online'] as const).some((key) => {
    const refs = liveTileRefs[key];
    return refs.roots.length > 0 || refs.notes.length > 0 || refs.actions.length > 0;
  });

  if (hasLiveTileTargets) {
    window.setInterval(() => {
      refreshLiveTileNotes();
    }, LIVE_RELATIVE_REFRESH_MS);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    refreshCounters({ onlyStale: true });
  });

  runWhenIdleOrInteracted(() => {
    refreshCounters();
  });
};
