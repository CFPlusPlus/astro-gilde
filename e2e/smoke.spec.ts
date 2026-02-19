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
  await expect(page.getByText(/1[.,]234 Spieler/)).toBeVisible();

  await page.getByRole('button', { name: 'Ranglisten' }).click();
  await expect(
    page.getByRole('region', { name: 'Ranglisten Ergebnisse' }).getByRole('heading', {
      name: 'Ranglisten',
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Steve/ })).toBeVisible();
});
