import { expect, type Page } from '@playwright/test';

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

const DEFAULT_READY_TIMEOUT_MS = 15_000;

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

  await page.addInitScript(
    ({
      metrics: nextMetrics,
      players: nextPlayers,
      leaderboards: nextLeaderboards,
      playerStatsByUuid: nextPlayerStatsByUuid,
      defaultPlayerStats: nextDefaultPlayerStats,
      summaryDelayMs: nextSummaryDelayMs,
      summaryStatus: nextSummaryStatus,
      summaryPayload: nextSummaryPayload,
      generatedAt: nextGeneratedAt,
      fallbackMetricId: nextFallbackMetricId,
    }) => {
      const originalFetch = window.fetch.bind(window);

      const sleep = (ms: number): Promise<void> =>
        ms > 0
          ? new Promise((resolve) => {
              window.setTimeout(resolve, ms);
            })
          : Promise.resolve();

      const toRequestUrl = (input: RequestInfo | URL): URL | null => {
        if (typeof input === 'string') return new URL(input, window.location.href);
        if (input instanceof URL) return input;
        if (input instanceof Request) return new URL(input.url, window.location.href);
        return null;
      };

      const createJsonResponse = (status: number, payload: unknown): Response =>
        new Response(JSON.stringify(payload), {
          status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        });

      const resolveEndpoint = (pathname: string): string | null => {
        const normalizedPath = pathname.replace(/\/+$/, '');
        if (!normalizedPath.startsWith('/api/')) return null;

        const segments = normalizedPath.split('/').filter((segment) => segment.length > 0);
        return segments.at(-1) ?? null;
      };

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const requestUrl = toRequestUrl(input);
        if (!requestUrl || requestUrl.origin !== window.location.origin) {
          return originalFetch(input, init);
        }

        const endpoint = resolveEndpoint(requestUrl.pathname);
        if (!endpoint) {
          return originalFetch(input, init);
        }

        switch (endpoint) {
          case 'summary': {
            await sleep(nextSummaryDelayMs);

            if (nextSummaryStatus !== 200) {
              return createJsonResponse(nextSummaryStatus, { error: 'summary-failed' });
            }

            return createJsonResponse(200, nextSummaryPayload);
          }
          case 'metrics':
            return createJsonResponse(200, {
              __generated: nextGeneratedAt,
              metrics: nextMetrics,
            });
          case 'leaderboard': {
            const metricId = requestUrl.searchParams.get('metric') ?? nextFallbackMetricId;
            const rows = nextLeaderboards[metricId] ?? [];

            return createJsonResponse(200, {
              __generated: nextGeneratedAt,
              __players: nextPlayers,
              boards: {
                [metricId]: rows,
              },
              cursors: {
                [metricId]: null,
              },
            });
          }
          case 'players': {
            const query = (requestUrl.searchParams.get('q') ?? '').trim().toLowerCase();

            const items = Object.entries(nextPlayers)
              .filter(([uuid, name]) => {
                if (!query) return false;
                return uuid.toLowerCase().includes(query) || name.toLowerCase().includes(query);
              })
              .slice(0, 6)
              .map(([uuid, name]) => ({ uuid, name }));

            return createJsonResponse(200, {
              __generated: nextGeneratedAt,
              items,
            });
          }
          case 'player': {
            const uuid = (requestUrl.searchParams.get('uuid') ?? '').trim();
            const hasSpecificData =
              nextPlayerStatsByUuid !== undefined &&
              Object.prototype.hasOwnProperty.call(nextPlayerStatsByUuid, uuid);
            const playerData = hasSpecificData
              ? nextPlayerStatsByUuid[uuid]
              : nextDefaultPlayerStats;

            if (!playerData) {
              return createJsonResponse(200, {
                __generated: nextGeneratedAt,
                found: false,
                uuid,
                name: nextPlayers[uuid] ?? uuid,
              });
            }

            return createJsonResponse(200, {
              __generated: nextGeneratedAt,
              found: true,
              uuid,
              name: nextPlayers[uuid] ?? uuid,
              player: playerData,
            });
          }
          default:
            return originalFetch(input, init);
        }
      };
    },
    {
      metrics,
      players,
      leaderboards,
      playerStatsByUuid,
      defaultPlayerStats,
      summaryDelayMs,
      summaryStatus,
      summaryPayload,
      generatedAt,
      fallbackMetricId,
    },
  );
}

export async function installPlayerStatsMock(
  page: Page,
  {
    players,
    playerStatsByUuid,
    defaultPlayerStats,
    generatedAt = '2026-02-20T12:00:00.000Z',
  }: {
    players?: StatsPlayers;
    playerStatsByUuid?: Record<string, StatsPlayerData>;
    defaultPlayerStats?: StatsPlayerData;
    generatedAt?: string;
  },
): Promise<void> {
  await installStatsMocks(page, {
    metrics: { hours: { label: 'Hours', category: 'Activity' } },
    players: players ?? {},
    leaderboards: {},
    playerStatsByUuid,
    defaultPlayerStats,
    summaryPayload: {
      __generated: generatedAt,
      player_count: 0,
      totals: {
        hours: 0,
        distance: 0,
        mob_kills: 0,
        creeper: 0,
      },
    },
  });
}

export async function waitForStatsAppReady(
  page: Page,
  timeout = DEFAULT_READY_TIMEOUT_MS,
): Promise<void> {
  await expect(page.locator('[data-stats-app-ready]').first()).toHaveAttribute(
    'data-stats-app-ready',
    'true',
    { timeout },
  );
}

export async function waitForPlayerStatsAppReady(
  page: Page,
  timeout = DEFAULT_READY_TIMEOUT_MS,
): Promise<void> {
  await expect(page.locator('[data-player-stats-app-ready]').first()).toHaveAttribute(
    'data-player-stats-app-ready',
    'true',
    { timeout },
  );
}
