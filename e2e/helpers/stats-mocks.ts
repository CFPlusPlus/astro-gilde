import type { Page, Route } from '@playwright/test';

type StatsSummaryPayload = {
  __generated: string;
  player_count: number;
  totals: {
    hours: number;
    distance: number;
    mob_kills: number;
    creeper: number;
  };
};

export type StatsMetricDef = {
  readonly label: string;
  readonly category: string;
  readonly unit?: string;
  readonly decimals?: number;
};

export type StatsMetrics = Record<string, StatsMetricDef>;

export type StatsPlayers = Record<string, string>;

export type StatsLeaderboardRow = {
  uuid: string;
  value: number;
};

export type StatsLeaderboards = Record<string, StatsLeaderboardRow[]>;

export type StatsPlayerData = Record<string, unknown>;

type InstallStatsMocksOptions = {
  metrics: StatsMetrics;
  players: StatsPlayers;
  leaderboards: StatsLeaderboards;
  playerStatsByUuid?: Record<string, StatsPlayerData>;
  defaultPlayerStats?: StatsPlayerData;
  summaryDelayMs?: number;
  summaryStatus?: 200 | 500;
  summaryPayload?: StatsSummaryPayload;
};

type StatsFetchMockState = {
  generatedAt: string;
  fallbackMetricId: string;
  metrics: StatsMetrics;
  players: StatsPlayers;
  leaderboards: StatsLeaderboards;
  playerStatsByUuid?: Record<string, StatsPlayerData>;
  defaultPlayerStats?: StatsPlayerData;
  summaryDelayMs: number;
  summaryStatus: 200 | 500;
  summaryPayload: StatsSummaryPayload;
};

function resolveLastPathSegment(requestUrl: string): string | null {
  try {
    const url = new URL(requestUrl);
    const segments = url.pathname.split('/').filter((segment) => segment.length > 0);
    return segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

async function routeApi(
  page: Page,
  endpoint: string,
  handler: (route: Route) => Promise<void> | void,
): Promise<void> {
  await page.route('**/*', async (route) => {
    const lastSegment = resolveLastPathSegment(route.request().url());
    if (lastSegment !== endpoint) {
      await route.fallback();
      return;
    }
    await handler(route);
  });
}

async function installStatsFetchMocks(page: Page, state: StatsFetchMockState): Promise<void> {
  await page.addInitScript((payload: StatsFetchMockState) => {
    const rawWindow = window as Window & {
      fetch: typeof fetch;
      __MG_STATS_FETCH_MOCK_INSTALLED__?: boolean;
      __MG_STATS_FETCH_MOCK_STATE__?: StatsFetchMockState;
    };

    rawWindow.__MG_STATS_FETCH_MOCK_STATE__ = payload;
    if (rawWindow.__MG_STATS_FETCH_MOCK_INSTALLED__) return;
    rawWindow.__MG_STATS_FETCH_MOCK_INSTALLED__ = true;

    const originalFetch = rawWindow.fetch.bind(window);
    rawWindow.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(requestUrl, window.location.origin);
      } catch {
        return originalFetch(input, init);
      }

      const segments = parsedUrl.pathname.split('/').filter((segment) => segment.length > 0);
      const endpoint = segments.at(-1);
      const state = rawWindow.__MG_STATS_FETCH_MOCK_STATE__;
      if (!endpoint || !state) {
        return originalFetch(input, init);
      }

      const jsonResponse = (body: unknown, status = 200): Response =>
        new Response(JSON.stringify(body), {
          status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        });

      if (endpoint === 'summary') {
        if (state.summaryDelayMs > 0) {
          await new Promise((resolve) => {
            setTimeout(resolve, state.summaryDelayMs);
          });
        }
        if (state.summaryStatus !== 200) {
          return jsonResponse({ error: 'summary-failed' }, state.summaryStatus);
        }
        return jsonResponse(state.summaryPayload);
      }

      if (endpoint === 'metrics') {
        return jsonResponse({
          __generated: state.generatedAt,
          metrics: state.metrics,
        });
      }

      if (endpoint === 'leaderboard') {
        const metricId = parsedUrl.searchParams.get('metric') ?? state.fallbackMetricId;
        const rows = state.leaderboards[metricId] ?? [];
        return jsonResponse({
          __generated: state.generatedAt,
          __players: state.players,
          boards: {
            [metricId]: rows,
          },
          cursors: {
            [metricId]: null,
          },
        });
      }

      if (endpoint === 'players') {
        const query = (parsedUrl.searchParams.get('q') ?? '').trim().toLowerCase();
        const items = Object.entries(state.players)
          .filter(([uuid, name]) => {
            if (!query) return false;
            return uuid.toLowerCase().includes(query) || name.toLowerCase().includes(query);
          })
          .slice(0, 6)
          .map(([uuid, name]) => ({ uuid, name }));
        return jsonResponse({
          __generated: state.generatedAt,
          items,
        });
      }

      if (endpoint === 'player') {
        const uuid = (parsedUrl.searchParams.get('uuid') ?? '').trim();
        const hasSpecificData =
          state.playerStatsByUuid !== undefined &&
          Object.prototype.hasOwnProperty.call(state.playerStatsByUuid, uuid);
        const playerData = hasSpecificData
          ? state.playerStatsByUuid?.[uuid]
          : state.defaultPlayerStats;
        if (!playerData) {
          return jsonResponse({
            __generated: state.generatedAt,
            found: false,
            uuid,
            name: state.players[uuid] ?? uuid,
          });
        }
        return jsonResponse({
          __generated: state.generatedAt,
          found: true,
          uuid,
          name: state.players[uuid] ?? uuid,
          player: playerData,
        });
      }

      return originalFetch(input, init);
    };
  }, state);
}

const DEFAULT_SUMMARY_PAYLOAD: StatsSummaryPayload = {
  __generated: '2026-02-20T12:00:00.000Z',
  player_count: 2222,
  totals: {
    hours: 321.5,
    distance: 8765.4,
    mob_kills: 777,
    creeper: 45,
  },
};

export async function installStatsMocks(
  page: Page,
  {
    metrics,
    players,
    leaderboards,
    playerStatsByUuid,
    defaultPlayerStats,
    summaryDelayMs = 0,
    summaryStatus = 200,
    summaryPayload = DEFAULT_SUMMARY_PAYLOAD,
  }: InstallStatsMocksOptions,
): Promise<void> {
  const generatedAt = summaryPayload.__generated;
  const fallbackMetricId = Object.keys(metrics)[0] ?? 'hours';
  await installStatsFetchMocks(page, {
    generatedAt,
    fallbackMetricId,
    metrics,
    players,
    leaderboards,
    playerStatsByUuid,
    defaultPlayerStats,
    summaryDelayMs,
    summaryStatus,
    summaryPayload,
  });

  await routeApi(page, 'summary', async (route) => {
    if (summaryDelayMs > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, summaryDelayMs);
      });
    }

    if (summaryStatus !== 200) {
      await route.fulfill({
        status: summaryStatus,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ error: 'summary-failed' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(summaryPayload),
    });
  });

  await routeApi(page, 'metrics', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: generatedAt,
        metrics,
      }),
    });
  });

  await routeApi(page, 'leaderboard', async (route) => {
    const requestUrl = new URL(route.request().url());
    const metricId = requestUrl.searchParams.get('metric') ?? fallbackMetricId;
    const rows = leaderboards[metricId] ?? [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: generatedAt,
        __players: players,
        boards: {
          [metricId]: rows,
        },
        cursors: {
          [metricId]: null,
        },
      }),
    });
  });

  await routeApi(page, 'players', async (route) => {
    const requestUrl = new URL(route.request().url());
    const query = (requestUrl.searchParams.get('q') ?? '').trim().toLowerCase();

    const items = Object.entries(players)
      .filter(([uuid, name]) => {
        if (!query) return false;
        return uuid.toLowerCase().includes(query) || name.toLowerCase().includes(query);
      })
      .slice(0, 6)
      .map(([uuid, name]) => ({ uuid, name }));

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: generatedAt,
        items,
      }),
    });
  });

  await routeApi(page, 'player', async (route) => {
    const requestUrl = new URL(route.request().url());
    const uuid = (requestUrl.searchParams.get('uuid') ?? '').trim();
    const hasSpecificData =
      playerStatsByUuid !== undefined &&
      Object.prototype.hasOwnProperty.call(playerStatsByUuid, uuid);
    const playerData = hasSpecificData ? playerStatsByUuid[uuid] : defaultPlayerStats;

    if (!playerData) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          __generated: generatedAt,
          found: false,
          uuid,
          name: players[uuid] ?? uuid,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: generatedAt,
        found: true,
        uuid,
        name: players[uuid] ?? uuid,
        player: playerData,
      }),
    });
  });
}
