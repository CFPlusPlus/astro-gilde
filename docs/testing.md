# Teststrategie (Unit und E2E)

Diese Seite dokumentiert die aktuelle Testaufteilung und die wichtigsten Ausführungswege.

## Relevante Dateien

- `vitest.config.ts`
- `playwright.config.ts`
- `e2e/*.spec.ts`
- `.github/workflows/quality.yml`

## Unit-Tests (Vitest)

Command:

```bash
npm run test
```

Konfiguration:

- Vitest läuft mit `vitest run`
- `e2e/**` ist in `vitest.config.ts` explizit ausgeschlossen

Typische Unit-Tests liegen in `src/features/**` und `src/lib/**`.

## E2E-Tests (Playwright)

Command:

```bash
npm run test:e2e
```

Konfiguration (`playwright.config.ts`):

- `testDir: ./e2e`
- Browserprojekt: `chromium` (Desktop Chrome)
- `baseURL: http://127.0.0.1:4321`
- lokaler Webserver: `npm run dev -- --host 127.0.0.1 --port 4321`
- `reuseExistingServer: !process.env.CI`
- `retries`: CI = 2, lokal = 0
- `trace: on-first-retry`

## Aktuelle E2E-Schwerpunkte

- `e2e/smoke.spec.ts`
  - Seiten-Erreichbarkeit, Navigation, Encoding-Artefakte, Home-Live-Verhalten
- `e2e/stats-mobile-regressions.spec.ts`
  - mobile UI-Regressionschecks für Statistikansichten
- `e2e/stats-utility.spec.ts`
  - Utility-Flows (URL-State, Cache-Verhalten, Sortierung, Versus)

Mocking-Helfer:

- `e2e/helpers/stats-mocks.ts` für reproduzierbare `/api/*`-Antworten

## CI-Ausführung

In `.github/workflows/quality.yml` laufen Tests nach Format/Lint/Check/Config-Check:

- `npm run test`
- `npm run test:e2e`

Damit sind Unit- und Browserflüsse Teil des Standard-Quality-Gates.

## Empfohlene lokale Reihenfolge

Für schnelle Iteration:

1. `npm run test` (Unit zuerst)
2. `npm run test:e2e` (Flows/Rendering)

Vor Merge:

1. `npm run format:check`
2. `npm run lint`
3. `npm run check`
4. `npm run config:check`
5. `npm run test`
6. `npm run test:e2e`
7. `npm run build`
