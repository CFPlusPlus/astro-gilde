<p align="center">
  <a href="https://minecraft-gilde.de" target="_blank" rel="noopener noreferrer">
    <img src="./src/assets/images/branding/logo-big.webp" alt="Minecraft Gilde" width="360" />
  </a>
</p>

<p align="center">
  <a href="https://discord.minecraft-gilde.de"><img alt="Discord" src="https://img.shields.io/discord/1219625244906754093?label=Discord&amp;logo=discord&amp;logoColor=white&amp;color=5865F2" /></a>&nbsp;</a>&nbsp;
  <a href="https://github.com/CFPlusPlus/minecraft-gilde-web/actions/workflows/quality.yml"><img alt="Build &amp; Quality" src="https://img.shields.io/github/actions/workflow/status/CFPlusPlus/minecraft-gilde-web/quality.yml?branch=main&amp;label=Build%20%26%20Quality" /></a>&nbsp;
  <a href="https://www.codefactor.io/repository/github/minecraft-gilde/website/overview/main"><img alt="CodeFactor" src="https://www.codefactor.io/repository/github/minecraft-gilde/website/badge/main" /></a>&nbsp;
</p>

# Minecraft Gilde Web

Offizielle Website von **Minecraft-Gilde.de** (Minecraft-Server: **Minecraft Gilde**), gebaut mit **Astro**.

## Tech-Stack

- Astro (statische Seite)
- TypeScript (strict)
- Tailwind CSS
- React (Astro Islands)
- Vitest (Unit-Tests)
- Node.js >= 22

## Schnellstart

```bash
npm install
npm run dev
```

Dev-Server: `http://localhost:4321`

## Wichtige Befehle

| Befehl                 | Zweck                           |
| :--------------------- | :------------------------------ |
| `npm run dev`          | Lokale Entwicklung              |
| `npm run dev:worker`   | Lokal inkl. Worker-API (`/api`) |
| `npm run build`        | Produktionsbuild nach `dist/`   |
| `npm run preview`      | Lokale Vorschau des Builds      |
| `npm run check`        | Astro Type-/Template-Check      |
| `npm run lint`         | ESLint                          |
| `npm run test`         | Unit-Tests (Vitest)             |
| `npm run test:e2e`     | End-to-End-Tests (Playwright)   |
| `npm run config:check` | Konfigurations-Drift prüfen     |
| `npm run format:check` | Prettier-Check (CI-tauglich)    |

## Lokal testen (mit/ohne API)

### 1) Mit lokaler API (empfohlen)

```bash
cp .dev.vars.example .dev.vars
# .dev.vars mit DB-Daten befüllen
npm run dev:worker
```

- Website und API laufen zusammen unter `http://localhost:8787`
- Beispiel: `http://localhost:8787/api/metrics`

### 2) Ohne lokale API (nur Frontend)

```bash
npm run dev
```

- Frontend läuft unter `http://localhost:4321`
- `/api/*` ist dabei nicht lokal aktiv (Statistikfeatures können eingeschränkt sein)

### 3) Ohne lokale API, aber mit externem API-Ziel

```bash
PUBLIC_API_ORIGIN=https://<dein-api-host> npm run dev
```

- Frontend nutzt dann das externe API-Ziel für `/api/*`
- Keine Secrets im Frontend setzen (nur URL, niemals DB-Credentials)

## Inhalte pflegen

- Befehle: `src/content/commands/list.json`
- Regeln: `src/content/rules/main.json`
- FAQ: `src/content/faq/main.json`
- Tutorial: `src/content/tutorial/*.md`

Hinweis: In Regeln werden Abschnitte teilweise als HTML-Strings gepflegt. Inhalte sauber escapen.

## Projektbereiche

- `src/pages/` für Seiten
- `src/layouts/` für Layouts
- `src/components/` für UI-Komponenten
- `src/features/` für Feature-Module
- `src/scripts/` für Browser-Logik
- `src/content/` für redaktionelle Inhalte
- `public/` für statische Assets und Server-Dateien
- `scripts/` für Build-Helfer

## Doku unter `docs/`

- [Doku-Index](./docs/index.md)
- [Konfiguration und Umgebungsvariablen](./docs/configuration.md)
- [Frontend-Bootstrap und Ladeverhalten](./docs/frontend-bootstrap.md)
- [Content-Collections und Datenformate](./docs/content-collections.md)
- [SEO, Canonical und strukturierte Daten](./docs/seo-canonical-structured-data.md)
- [Build- und Output-Besonderheiten](./docs/build-output.md)
- [Teststrategie (Unit und E2E)](./docs/testing.md)
- [Projektstruktur und Frontend-Konventionen](./docs/project-structure.md)
- [Statistik-API im Worker](./docs/stats-api.md)
- [Live-Daten Architektur](./docs/live-data.md)
- [Content Security Policy (CSP)](./docs/security-csp.md)

## Qualität

Empfohlener lokaler Gate-Run:

```bash
npm run format:check
npm run lint
npm run check
npm run test
```

Bei Build-/Routing-/Asset-Änderungen zusätzlich:

```bash
npm run build
```

CI-Workflow: `.github/workflows/quality.yml`

## Deployment

- `npm run build` erzeugt die statische Ausgabe in `dist/`.
- Inhalte aus `public/` werden 1:1 nach `dist/` kopiert.
