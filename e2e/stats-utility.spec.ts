import { expect, test, type Page } from '@playwright/test';

const LAST_CATEGORIES_STORAGE_KEY = 'stats:lastCategories:v1';
const SUMMARY_CACHE_STORAGE_KEY = 'mg:live-resource:v1:stats-kpi-summary';

const STATS_METRICS = {
  playtime: {
    label: 'Playtime',
    category: 'Activity',
    unit: 'h',
    decimals: 2,
  },
  hours: {
    label: 'Hours',
    category: 'Activity',
    unit: 'h',
    decimals: 2,
  },
  distance: {
    label: 'Distance',
    category: 'Exploration',
    unit: 'km',
    decimals: 2,
  },
  mob_kills: {
    label: 'Mob-Kills',
    category: 'Combat',
  },
  deaths: {
    label: 'Deaths',
    category: 'Combat',
  },
  mined: {
    label: 'Mined Blocks',
    category: 'Resources',
  },
  crafted: {
    label: 'Crafted Items',
    category: 'Resources',
  },
  used: {
    label: 'Used Items',
    category: 'Resources',
  },
  broken: {
    label: 'Broken Items',
    category: 'Resources',
  },
  killed_by_warden: {
    label: 'Warden Defeats',
    category: 'Combat',
  },
} as const;

const STATS_PLAYERS: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'PlaytimePro',
  '00000000-0000-0000-0000-000000000002': 'PlaytimeRival',
  '00000000-0000-0000-0000-000000000003': 'HourHero',
  '00000000-0000-0000-0000-000000000004': 'DistanceScout',
  '00000000-0000-0000-0000-000000000005': 'MobsterOne',
  '00000000-0000-0000-0000-000000000006': 'MobsterTwo',
  '00000000-0000-0000-0000-000000000007': 'WardenHunter',
  '00000000-0000-0000-0000-000000000008': 'BuilderBob',
  'uuid-alpha': 'Alpha',
  'uuid-beta': 'Beta',
};

const LEADERBOARDS: Record<string, Array<{ uuid: string; value: number }>> = {
  playtime: [
    { uuid: '00000000-0000-0000-0000-000000000001', value: 950 },
    { uuid: '00000000-0000-0000-0000-000000000002', value: 900 },
  ],
  hours: [
    { uuid: '00000000-0000-0000-0000-000000000003', value: 420 },
    { uuid: '00000000-0000-0000-0000-000000000001', value: 350 },
  ],
  distance: [
    { uuid: '00000000-0000-0000-0000-000000000004', value: 2100 },
    { uuid: '00000000-0000-0000-0000-000000000003', value: 1700 },
  ],
  mob_kills: [
    { uuid: '00000000-0000-0000-0000-000000000005', value: 300 },
    { uuid: '00000000-0000-0000-0000-000000000006', value: 250 },
  ],
  deaths: [
    { uuid: '00000000-0000-0000-0000-000000000006', value: 90 },
    { uuid: '00000000-0000-0000-0000-000000000005', value: 85 },
  ],
  mined: [
    { uuid: '00000000-0000-0000-0000-000000000008', value: 1200 },
    { uuid: '00000000-0000-0000-0000-000000000001', value: 980 },
  ],
  crafted: [
    { uuid: '00000000-0000-0000-0000-000000000008', value: 400 },
    { uuid: '00000000-0000-0000-0000-000000000003', value: 300 },
  ],
  used: [
    { uuid: '00000000-0000-0000-0000-000000000008', value: 750 },
    { uuid: '00000000-0000-0000-0000-000000000004', value: 700 },
  ],
  broken: [
    { uuid: '00000000-0000-0000-0000-000000000008', value: 250 },
    { uuid: '00000000-0000-0000-0000-000000000003', value: 200 },
  ],
  killed_by_warden: [
    { uuid: '00000000-0000-0000-0000-000000000007', value: 12 },
    { uuid: '00000000-0000-0000-0000-000000000005', value: 4 },
  ],
};

const VERSUS_PLAYER_DATA: Record<string, Record<string, unknown>> = {
  'uuid-alpha': {
    'minecraft:custom': {
      'minecraft:play_time': 72_000,
      'minecraft:mob_kills': 110,
      'minecraft:deaths': 8,
    },
  },
  'uuid-beta': {
    'minecraft:custom': {
      'minecraft:play_time': 36_000,
      'minecraft:mob_kills': 140,
      'minecraft:deaths': 14,
    },
  },
};

async function installStatsMocks(
  page: Page,
  {
    summaryDelayMs = 0,
    summaryStatus = 200,
  }: {
    summaryDelayMs?: number;
    summaryStatus?: 200 | 500;
  } = {},
): Promise<void> {
  await page.route('**/api/summary**', async (route) => {
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
      body: JSON.stringify({
        __generated: '2026-02-20T12:00:00.000Z',
        player_count: 2222,
        totals: {
          hours: 321.5,
          distance: 8765.4,
          mob_kills: 777,
          creeper: 45,
        },
      }),
    });
  });

  await page.route('**/api/metrics', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: '2026-02-20T12:00:00.000Z',
        metrics: STATS_METRICS,
      }),
    });
  });

  await page.route('**/api/leaderboard**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const metricId = requestUrl.searchParams.get('metric') || 'hours';
    const rows = LEADERBOARDS[metricId] || [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: '2026-02-20T12:00:00.000Z',
        __players: STATS_PLAYERS,
        boards: {
          [metricId]: rows,
        },
        cursors: {
          [metricId]: null,
        },
      }),
    });
  });

  await page.route('**/api/players**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const query = (requestUrl.searchParams.get('q') || '').trim().toLowerCase();

    const items = Object.entries(STATS_PLAYERS)
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
        __generated: '2026-02-20T12:00:00.000Z',
        items,
      }),
    });
  });

  await page.route('**/api/player**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const uuid = (requestUrl.searchParams.get('uuid') || '').trim();
    const playerData = VERSUS_PLAYER_DATA[uuid];

    if (!playerData) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          __generated: '2026-02-20T12:00:00.000Z',
          found: false,
          uuid,
          name: uuid,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: '2026-02-20T12:00:00.000Z',
        found: true,
        uuid,
        name: STATS_PLAYERS[uuid] || uuid,
        player: playerData,
      }),
    });
  });
}

async function seedSummaryCache(page: Page): Promise<void> {
  const staleTimestamp = Date.now() - 10 * 60_000;

  await page.addInitScript(
    ({ key, staleAt }: { key: string; staleAt: number }) => {
      const payload = {
        status: 'ok',
        updatedAt: staleAt,
        fetchedAt: staleAt,
        data: {
          __generated: '2026-02-20T11:30:00.000Z',
          player_count: 2222,
          totals: {
            hours: 111.5,
            distance: 5000,
            mob_kills: 333,
            creeper: 10,
          },
        },
      };
      window.localStorage.setItem(key, JSON.stringify(payload));
    },
    {
      key: SUMMARY_CACHE_STORAGE_KEY,
      staleAt: staleTimestamp,
    },
  );
}

async function installPlayerStatsSortMock(page: Page): Promise<void> {
  await page.route('**/api/player**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const uuid = (requestUrl.searchParams.get('uuid') || '').trim();

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: '2026-02-20T12:00:00.000Z',
        found: true,
        uuid,
        name: 'SortPlayer',
        player: {
          'minecraft:custom': {
            'minecraft:jump': 2,
            'minecraft:mob_kills': 150,
            'minecraft:play_time': 72_000,
          },
        },
      }),
    });
  });
}

test('Overview Mock: loading wechselt auf ok', async ({ page }) => {
  await installStatsMocks(page, { summaryDelayMs: 450, summaryStatus: 200 });
  await page.goto('/statistiken/');

  await expect(page.locator('.animate-pulse').first()).toBeVisible();
  await expect(page.getByText(/321[.,]50 h/)).toBeVisible();
});

test('Overview Mock: zeigt error ohne Cache', async ({ page }) => {
  await installStatsMocks(page, { summaryStatus: 500 });
  await page.goto('/statistiken/');

  await expect(page.getByText('Daten konnten nicht geladen werden').first()).toBeVisible();
});

test('Overview Mock: zeigt stale mit Cache bei API-Fehler', async ({ page }) => {
  await seedSummaryCache(page);
  await installStatsMocks(page, { summaryStatus: 500 });
  await page.goto('/statistiken/');

  await expect(page.getByText(/111[.,]50 h/)).toBeVisible();
  await expect(page.getByText('veraltet').first()).toBeVisible();
});

test('URL ?tab=ranglisten&cat=playtime&top=20 oeffnet Ranglisten-View', async ({ page }) => {
  await installStatsMocks(page);
  await page.goto('/statistiken/?tab=ranglisten&cat=playtime&top=20');

  await expect(page.getByRole('tab', { name: 'Ranglisten' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Top-N: 20' })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Ranglisten Ergebnisse' }).getByText('PlaytimePro'),
  ).toBeVisible();
});

test('Schnellzugriff-Pill setzt Kategorie und URL', async ({ page }) => {
  await installStatsMocks(page);
  await page.goto('/statistiken/?tab=leaderboards');

  const quickAccess = page.locator('section[aria-label="Schnellzugriff"]');
  await quickAccess.getByRole('button', { name: 'Mob-Kills' }).click();

  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('leaderboards');
  await expect.poll(() => new URL(page.url()).searchParams.get('cat')).toBe('mob_kills');
  await expect(
    page.getByRole('region', { name: 'Ranglisten Ergebnisse' }).getByText('MobsterOne'),
  ).toBeVisible();
});

test('Kategorie-Auswahl schreibt Zuletzt angesehen und rendert Pills', async ({ page }) => {
  await installStatsMocks(page);
  await page.goto('/statistiken/?tab=leaderboards');

  await page.getByRole('button', { name: 'Warden Defeats' }).click();

  await expect.poll(() => new URL(page.url()).searchParams.get('cat')).toBe('killed_by_warden');
  await expect
    .poll(() =>
      page.evaluate(
        (storageKey) => window.localStorage.getItem(storageKey),
        LAST_CATEGORIES_STORAGE_KEY,
      ),
    )
    .toContain('killed_by_warden');

  const recentlyViewed = page.locator('section[aria-label="Zuletzt angesehen"]');
  await expect(recentlyViewed).toBeVisible();
  await expect(recentlyViewed.getByRole('button', { name: 'Warden Defeats' })).toBeVisible();
});

test('URL ?tab=versus&a=...&b=... zeigt Vergleich', async ({ page }) => {
  await installStatsMocks(page);
  await page.goto('/statistiken/?tab=versus&a=uuid-alpha&b=uuid-beta');

  await expect(page.getByRole('tab', { name: 'Versus' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Zwischenstand', { exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'uuid-alpha' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'uuid-beta' })).toBeVisible();
});

test('Sortierung auf Spielerseite aendert die Reihenfolge', async ({ page }) => {
  await installPlayerStatsSortMock(page);
  await page.addInitScript(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('uuid')) return;
    params.set('uuid', 'sort-player');
    params.set('tab', 'allgemein');
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  });
  await page.goto('/statistiken/spieler/');

  const panel = page.locator('#player-stats-panel-allgemein');
  const firstRawCell = panel.locator('tbody tr').first().locator('td').nth(1);

  await expect(page.getByRole('button', { name: 'Wert sortieren' })).toBeVisible();
  await expect(panel.locator('tbody tr')).toHaveCount(3);

  await page.getByRole('button', { name: 'Wert sortieren' }).click();
  await expect(firstRawCell).toHaveText('minecraft:jump');

  await page.getByRole('button', { name: 'Wert sortieren' }).click();
  await expect(firstRawCell).toHaveText('minecraft:play_time');
});
