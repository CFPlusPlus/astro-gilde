import { expect, test, type Page } from '@playwright/test';
import { installStatsMocks, waitForStatsAppReady } from './helpers/stats-mocks';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

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
  mob_kills: {
    label: 'Mob-Kills',
    category: 'Combat',
  },
} as const;

const STATS_PLAYERS: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'PlaytimePro',
  '00000000-0000-0000-0000-000000000002': 'PlaytimeRival',
  '00000000-0000-0000-0000-000000000003': 'HourHero',
  '00000000-0000-0000-0000-000000000004': 'HourRival',
  '00000000-0000-0000-0000-000000000005': 'MobsterOne',
};

const LEADERBOARDS: Record<string, Array<{ uuid: string; value: number }>> = {
  playtime: [
    { uuid: '00000000-0000-0000-0000-000000000001', value: 950 },
    { uuid: '00000000-0000-0000-0000-000000000002', value: 900 },
  ],
  hours: [
    { uuid: '00000000-0000-0000-0000-000000000003', value: 420 },
    { uuid: '00000000-0000-0000-0000-000000000004', value: 350 },
  ],
  mob_kills: [{ uuid: '00000000-0000-0000-0000-000000000005', value: 300 }],
};

const SUMMARY_PAYLOAD = {
  __generated: '2026-02-20T12:00:00.000Z',
  player_count: 2222,
  totals: {
    hours: 321.5,
    distance: 8765.4,
    mob_kills: 777,
    creeper: 45,
  },
};

const DEFAULT_PLAYER_STATS = {
  'minecraft:custom': {
    'minecraft:play_time': 72_000,
  },
};

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;

  return a.x < bRight && aRight > b.x && a.y < bBottom && aBottom > b.y;
}

async function gotoRankingsReady(page: Page): Promise<void> {
  await page.goto('/statistiken/?tab=ranglisten&cat=hours');
  await waitForStatsAppReady(page);
  const rankingsRegion = page.getByRole('region', { name: 'Ranglisten Ergebnisse' });
  await expect(rankingsRegion.getByRole('button', { name: /HourHero.*ffnen/i })).toBeVisible();
}

test.describe('Statistiken Mobile Regressionen', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await installStatsMocks(page, {
      metrics: STATS_METRICS,
      players: STATS_PLAYERS,
      leaderboards: LEADERBOARDS,
      defaultPlayerStats: DEFAULT_PLAYER_STATS,
      summaryPayload: SUMMARY_PAYLOAD,
    });
  });

  test('Sticky Toolbar bleibt <= 64px und Tabs sind voll lesbar', async ({ page }) => {
    await gotoRankingsReady(page);

    const stickyToolbar = page.locator('[aria-label="Statistik Steuerung"]').first();
    await expect(stickyToolbar).toBeVisible();

    const toolbarBox = await stickyToolbar.boundingBox();
    expect(toolbarBox).not.toBeNull();
    expect(toolbarBox!.height).toBeLessThanOrEqual(64);

    const tabNav = page.getByRole('navigation', { name: 'Statistik Navigation' });
    const tabLabels = (await tabNav.getByRole('tab').allTextContents()).map((text) => text.trim());
    expect(tabLabels).toHaveLength(4);
    for (const tabLabel of tabLabels) {
      expect(tabLabel.length).toBeGreaterThanOrEqual(4);
      expect(tabLabel).not.toContain('…');
      expect(tabLabel).not.toContain('...');
    }
  });

  test('SearchSheet setzt Fokus direkt in das Suchfeld', async ({ page }) => {
    await gotoRankingsReady(page);

    await page.getByRole('button', { name: 'Suche' }).click();

    const searchDialog = page
      .locator('[role="dialog"]')
      .filter({ has: page.locator('input[role="combobox"]') });
    await expect(searchDialog).toBeVisible();
    await expect(searchDialog.locator('input[role="combobox"]')).toBeFocused();
  });

  test('OptionsSheet zeigt Top-N und erlaubt Neu laden', async ({ page }) => {
    await gotoRankingsReady(page);

    await page.getByRole('button', { name: 'Optionen' }).click();

    const optionsDialog = page
      .locator('[role="dialog"]')
      .filter({ has: page.getByRole('radiogroup', { name: /Top-N/ }) });
    await expect(optionsDialog).toBeVisible();
    await expect(optionsDialog.getByRole('radiogroup', { name: /Top-N/ })).toBeVisible();

    const reloadButton = optionsDialog.getByRole('button', { name: /Neu laden/ });
    await expect(reloadButton).toBeVisible();
    await expect(reloadButton).toBeEnabled();
    await reloadButton.click();
  });

  test('CategoriesSheet waehlen schliesst Sheet und zeigt Leaderboard Cards ohne Overlap', async ({
    page,
  }) => {
    await gotoRankingsReady(page);

    const rankingsRegion = page.getByRole('region', { name: 'Ranglisten Ergebnisse' });
    const rankingsTitle = rankingsRegion.getByRole('heading', { name: 'Ranglisten' });
    const categoriesButton = rankingsRegion.getByRole('button', { name: 'Kategorien' });

    await expect(rankingsTitle).toBeVisible();
    await expect(categoriesButton).toBeVisible();

    const titleBox = await rankingsTitle.boundingBox();
    const buttonBox = await categoriesButton.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(intersects(titleBox!, buttonBox!)).toBe(false);

    await categoriesButton.click();

    const categoriesDialog = page
      .locator('[role="dialog"]')
      .filter({ has: page.getByRole('searchbox', { name: /Kategorie suchen/i }) });
    await expect(categoriesDialog).toBeVisible();

    await categoriesDialog.getByRole('button', { name: /Playtime/ }).click();
    await expect(categoriesDialog).toBeHidden();

    await expect(rankingsRegion.getByRole('button', { name: /PlaytimePro.*ffnen/i })).toBeVisible();
  });
});
