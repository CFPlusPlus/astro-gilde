# Build- und Output-Besonderheiten

Diese Seite fasst die projektspezifischen Build-Einstellungen und Ausgabe-Eigenheiten zusammen.

## Relevante Dateien

- `astro.config.mjs`
- `package.json`
- `scripts/postbuild-404.mjs`
- `.github/workflows/quality.yml`

## Build-Command

In `package.json`:

```bash
npm run build
```

führt aus:

1. `astro build`
2. `node scripts/postbuild-404.mjs`

## Wichtige Astro-Build-Settings

Aus `astro.config.mjs`:

- `build.format: 'directory'`
- `trailingSlash: 'always'`
- `site: 'https://minecraft-gilde.de'`
- Integrationen: `@astrojs/react`, `@astrojs/sitemap`

Sitemap-Filter:

- `/404/` und `/statistiken/spieler/` werden aus der Sitemap ausgeschlossen.

## CSP im Build

Das Projekt nutzt `experimental.csp` mit Hash-Erzeugung für Astro-Inline-Runtime.

Details sind in [security-csp.md](./security-csp.md) dokumentiert.

## Vite-Besonderheiten

- `chunkSizeWarningLimit: 700` (skinview3d ist bewusst ein größerer, separater Chunk)
- Build-Metadaten (`GIT_COMMIT_HASH`, `GIT_BRANCH`, `GIT_REPO_URL`) werden via `vite.define` gesetzt

## Postbuild: 404-Kopie

`scripts/postbuild-404.mjs` stellt sicher, dass `dist/404.html` existiert:

- wenn `dist/404/index.html` vorhanden ist -> Kopie nach `dist/404.html`
- wenn `dist/404.html` bereits existiert -> kein Eingriff
- sonst -> Warnung im Log

## CI-Quality-Gate (Auszug)

`quality.yml` führt in Reihenfolge aus:

1. `npm ci`
2. Playwright-Browser-Install
3. `npm run format:check`
4. `npm run lint`
5. `npm run check`
6. `npm run config:check`
7. `npm run test`
8. `npm run test:e2e`
9. `npm run build`

## Änderungs-Checkliste

1. Bei Routing-/Output-Änderungen immer `npm run build` lokal prüfen.
2. Bei Domain-/Sitemap-Änderungen `site`, `siteUrl` und Filter konsistent halten.
3. Nach 404-/Hosting-Änderungen prüfen, ob `dist/404.html` weiterhin erzeugt wird.
