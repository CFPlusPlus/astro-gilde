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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function apiRoutePatterns(endpoint: string): RegExp[] {
  const escapedEndpoint = escapeRegex(endpoint);
  return [
    new RegExp(`^https?://[^?#]+/api/${escapedEndpoint}(?:\\?.*)?$`),
    new RegExp(`^https?://[^?#]+/${escapedEndpoint}(?:\\?.*)?$`),
  ];
}

async function routeApi(
  page: Page,
  endpoint: string,
  handler: (route: Route) => Promise<void> | void,
): Promise<void> {
  for (const pattern of apiRoutePatterns(endpoint)) {
    await page.route(pattern, handler);
  }
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
