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

const UNKNOWN_FALLBACK = 'unbekannt';
const LIVE_ERROR_VALUE = 'n/v';
const LIVE_ERROR_HINT = 'Status gerade nicht verfuegbar.';
const LIVE_CACHE_PREFIX = 'mg:live-counter:v2:';
const LIVE_FETCH_TIMEOUT_MS = 6_500;
const LIVE_IDLE_TIMEOUT_MS = 1_600;
const LIVE_IDLE_FALLBACK_DELAY_MS = 320;

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

  const updateCounter = async (
    definition: CounterDefinition,
    options?: { applyInitialState?: boolean },
  ): Promise<void> => {
    const { key, targets, fetcher, format, errorValue = LIVE_ERROR_VALUE, thresholds } = definition;
    if (!targets.length) return;
    if (inFlightKeys.has(key)) return;

    inFlightKeys.add(key);
    if (isLiveTileKey(key)) setLiveTileRetryBusy(key, true);

    try {
      const resource = getLiveResource(key, fetcher, {
        staleAfterMs: thresholds.staleAfterMs,
        maxCacheAgeMs: thresholds.maxCacheAgeMs,
        cachePrefix: LIVE_CACHE_PREFIX,
        persist: true,
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

      applyCounterState({
        key,
        targets,
        state: latest,
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

  const refreshCounters = (): void => {
    void Promise.all(
      counterDefinitions.map((definition) =>
        updateCounter(definition, { applyInitialState: false }),
      ),
    );
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
        void updateCounter(definition, { applyInitialState: false });
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
