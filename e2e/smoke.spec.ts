import { expect, test, type Page } from '@playwright/test';

const hasBrokenQuestionMarkArtifact = (text: string): boolean => {
  const withoutUrls = text.replace(/https?:\/\/\S+/g, ' ');
  return /\p{L}\?\p{L}/u.test(withoutUrls);
};

const expectNoEncodingArtifacts = async (page: Page, path: string): Promise<string> => {
  await page.goto(path);
  const text = await page.locator('body').innerText();
  expect(text).not.toContain('\uFFFD');
  expect(hasBrokenQuestionMarkArtifact(text)).toBe(false);
  return text;
};

const isFocusInsideMobileMenu = async (page: Page): Promise<boolean> => {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('[data-nav-panel]');
    const active = document.activeElement;
    return Boolean(panel && active instanceof HTMLElement && panel.contains(active));
  });
};

const installStatsApiMocks = async (page: Page): Promise<void> => {
  await page.route('**/api/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: '2026-02-10T18:30:00.000Z',
        player_count: 1234,
        totals: {
          hours: 321.5,
          distance: 9876.54,
          mob_kills: 555,
          creeper: 42,
        },
      }),
    });
  });

  await page.route('**/api/metrics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: '2026-02-10T18:30:00.000Z',
        metrics: {
          hours: {
            label: 'Spielzeit',
            category: 'Uebersicht',
            unit: 'h',
            decimals: 2,
          },
        },
      }),
    });
  });

  await page.route('**/api/leaderboard**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const metricId = requestUrl.searchParams.get('metric') ?? 'hours';
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: '2026-02-10T18:30:00.000Z',
        __players: {
          '00000000-0000-0000-0000-000000000001': 'Steve',
        },
        boards: {
          [metricId]: [{ uuid: '00000000-0000-0000-0000-000000000001', value: 321.5 }],
        },
        cursors: {
          [metricId]: null,
        },
      }),
    });
  });

  await page.route('**/api/players**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        __generated: '2026-02-10T18:30:00.000Z',
        items: [{ uuid: '00000000-0000-0000-0000-000000000001', name: 'Steve' }],
      }),
    });
  });
};

test('Startseite laedt und zeigt Hero', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Minecraft Gilde/i);
  await expect(page.getByRole('heading', { level: 1, name: 'Minecraft Gilde' })).toBeVisible();
});

test('Inhalte haben keine Encoding-Artefakte', async ({ page }) => {
  const befehleText = await expectNoEncodingArtifacts(page, '/befehle/');
  expect(befehleText).toContain('Türen');

  const paths = ['/faq/', '/tutorial/', '/regeln/'] as const;
  for (const path of paths) {
    await expectNoEncodingArtifacts(page, path);
  }
});

test('Startseite zeigt bei 3 Schritten keine doppelte Nummerierung', async ({ page }) => {
  await page.goto('/');

  const section = page.locator('#start');
  await expect(section.getByRole('heading', { level: 2, name: /3 Schritten/i })).toBeVisible();

  const listItems = section.locator('ol > li');
  await expect(listItems).toHaveCount(3);

  const customStepNumbers = await listItems.evaluateAll((items) =>
    items.map(
      (item) => item.querySelector<HTMLElement>(':scope > div > div')?.innerText.trim() ?? '',
    ),
  );
  expect(customStepNumbers).toEqual(['1', '2', '3']);

  const markerStyles = await listItems.evaluateAll((items) =>
    items.map((item) => window.getComputedStyle(item).listStyleType),
  );
  expect(markerStyles).toEqual(['none', 'none', 'none']);
});

test('Navbar Links funktionieren', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });

  const links: Array<{ label: string; path: string }> = [
    { label: 'Start', path: '/' },
    { label: 'Tutorial', path: '/tutorial/' },
    { label: 'Regeln', path: '/regeln/' },
    { label: 'Statistiken', path: '/statistiken/' },
    { label: 'Voten', path: '/voten/' },
  ];

  for (const link of links) {
    await page.goto('/tutorial/');
    await nav.getByRole('link', { name: link.label, exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(link.path);
  }
});

test.describe('Mobiles Menue', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('oeffnen und schliessen mit Fokus im Menue', async ({ page }) => {
    await page.goto('/');

    const toggle = page.locator('[data-nav-toggle]');
    const panel = page.locator('[data-nav-panel]');
    const menuLink = panel.getByRole('link', { name: 'Start', exact: true });

    await expect(panel).toBeHidden();
    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menuLink).toBeVisible();
    await expect.poll(() => isFocusInsideMobileMenu(page)).toBe(true);

    for (let step = 0; step < 8; step++) {
      await page.keyboard.press('Tab');
      await expect.poll(() => isFocusInsideMobileMenu(page)).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(menuLink).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });
});

test('Galerie zeigt mindestens ein sichtbares Bild', async ({ page }) => {
  await page.goto('/');

  const galleryImage = page.locator('[data-gallery] [data-gallery-a]');
  await galleryImage.scrollIntoViewIfNeeded();

  await expect(galleryImage).toBeVisible();
  await expect
    .poll(
      async () =>
        galleryImage.evaluate((img) =>
          img instanceof HTMLImageElement ? img.naturalWidth > 0 : false,
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
});

test('Statistiken laden mit API Mock', async ({ page }) => {
  await installStatsApiMocks(page);
  await page.goto('/statistiken/');

  await expect(page.getByRole('heading', { level: 1, name: 'Statistiken' })).toBeVisible();
  await expect(page.getByText(/321[.,]50 h/)).toBeVisible();

  await page.getByRole('tab', { name: 'Ranglisten' }).click();
  await expect(
    page.getByRole('region', { name: 'Ranglisten Ergebnisse' }).getByRole('heading', {
      name: 'Ranglisten',
    }),
  ).toBeVisible();
  await expect(page.getByRole('row', { name: /Steve/ })).toBeVisible();
});

test('Live-Section wechselt von loading auf ok mit API-Mocks', async ({ page }) => {
  await page.addInitScript(() => {
    (
      window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
        cancelIdleCallback?: (handle: number) => void;
      }
    ).requestIdleCallback = () => 1;
  });

  await page.route('**/api/guilds/*/widget.json', async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 120);
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        presence_count: 9,
      }),
    });
  });

  await page.route('**/api/v10/invites/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        approximate_member_count: 1234,
      }),
    });
  });

  await page.route('**/api.mcsrvstat.us/3/*', async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 120);
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        online: true,
        players: {
          online: 5,
          list: [{ name: 'Steve', uuid: '00000000-0000-0000-0000-000000000001' }],
        },
      }),
    });
  });

  await page.goto('/');

  const liveHeading = page.getByRole('heading', { level: 2, name: 'Live auf dem Server' });
  await expect(liveHeading).toBeVisible();

  const mcCounter = page.locator('[data-mc-online]').first();
  const mcTile = page.locator('[data-live-tile="mc-online"]').first();

  await expect(mcCounter).toHaveAttribute('data-live-state', 'loading');
  await liveHeading.click();
  await expect(mcTile).toHaveAttribute('data-live-state', 'ok');
  await expect(mcCounter).toHaveText('5');
});

test('Neu laden triggert Revalidate und faellt bei Fetch-Fehler auf stale zurueck', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const now = Date.now();
    const staleEntry = JSON.stringify({
      status: 'ok',
      data: '12',
      updatedAt: now - 120_000,
      fetchedAt: now - 120_000,
    });

    localStorage.setItem('mg:live-counter:v2:discord-online', staleEntry);

    (
      window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
        cancelIdleCallback?: (handle: number) => void;
      }
    ).requestIdleCallback = () => 1;
  });

  let discordWidgetCalls = 0;
  await page.route('**/api/guilds/*/widget.json', async (route) => {
    discordWidgetCalls += 1;
    await new Promise((resolve) => {
      setTimeout(resolve, 120);
    });
    await route.abort('failed');
  });

  await page.route('**/api/v10/invites/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        approximate_member_count: 1234,
      }),
    });
  });

  await page.route('**/api.mcsrvstat.us/3/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        online: true,
        players: {
          online: 3,
          list: [],
        },
      }),
    });
  });

  await page.goto('/');

  const discordTile = page.locator('[data-live-tile="discord-online"]').first();
  const reloadButton = page.locator('[data-live-retry="discord-online"]').first();
  const liveNote = page.locator('[data-live-note-for="discord-online"]').first();

  await expect(discordTile).toHaveAttribute('data-live-state', 'stale');
  await expect(reloadButton).toBeVisible();
  expect(discordWidgetCalls).toBe(0);

  await reloadButton.evaluate((button) => {
    (button as HTMLButtonElement).click();
  });

  await expect(discordTile).toHaveAttribute('data-live-state', 'loading');
  await expect.poll(() => discordWidgetCalls).toBe(1);
  await expect(discordTile).toHaveAttribute('data-live-state', 'stale');
  await expect(liveNote).toContainText('Es wird der letzte erfolgreiche Stand angezeigt.');
});
