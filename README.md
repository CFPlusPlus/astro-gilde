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

Offizielle Website von **Minecraft-Gilde.de** (Minecraft-Server: **Minecraft Gilde**) – gebaut mit **Astro**.

Dieses Repository enthält das Frontend (Pages, Layouts, Komponenten) sowie Content-Daten (Regeln & Befehle) über **Astro Content Collections**.

## Tech-Stack

- **Astro** (statisch, schnelle Builds)
- **TypeScript** (Strict)
- **Tailwind CSS**
- **React (Astro Islands)** für interaktive Bereiche (Statistiken & Spielerstatistiken)
- **skinview3d** (lazy geladen) für den 3D-Skin-Viewer

## Inhalte pflegen

- **Befehle:** `src/content/commands/list.json`
- **Regeln:** `src/content/rules/main.json`
- **Tutorial-Abschnitte:** `src/content/tutorial/*.md`

> Hinweis: In den Regeln werden Abschnitte als HTML-Strings gespeichert (z. B. für Formatierung/Listen). Bitte entsprechend sauber escapen.

---

## Projektstruktur (Auszug)

```text
/
├── public/
│   ├── images/
│   └── i18n/
├── src/
│   ├── components/
│   │   └── ui/
│   ├── content/
│   │   ├── commands/
│   │   ├── rules/
│   │   └── config.ts
│   ├── features/
│   │   ├── stats/              # /statistiken (React Island)
│   │   └── player-stats/       # /statistiken/spieler (React Island)
│   ├── layouts/
│   │   └── BaseLayout.astro
│   └── pages/
│       ├── index.astro
│       ├── regeln.astro
│       ├── befehle.astro
│       ├── statistiken.astro
│       └── statistiken/spieler.astro
├── astro.config.mjs
└── package.json
```

Mehr zur Ordnerstruktur von Astro findest du in der offiziellen Doku: https://docs.astro.build/en/basics/project-structure/

---

## Inline-Script Konvention

- Inline-Skripte in `.astro` nach Möglichkeit vermeiden.
- Früher Theme-/Config-Bootstraps wurden auf externe Dateien bzw. `data-*` Attribute verlagert.
- Fachlogik, DOM-Logik und Event-Handling liegen in `src/scripts/*`.
- Seiten/Komponenten importieren diese Skripte nur noch über kurze Bootstrap-Imports.
- Keine großen JS-Blöcke direkt in `src/pages/*`.

---

## Content Security Policy (CSP)

Die Seite liefert eine aktive CSP über Astro `experimental.csp` (siehe `astro.config.mjs`).
Für prerenderte Seiten wird die Policy als Meta-Tag mit Hashes erzeugt, damit auch Astro-interne Inline-Runtime-Skripte sauber abgedeckt sind.

Aktuelle Policy:

- `script-src 'self';` (via `scriptDirective.resources`)
- `style-src 'self';` (via `styleDirective.resources`)
- `default-src 'self';`
- `img-src 'self' data: https:;`
- `frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com;`
- `connect-src 'self' https:;`
- `base-uri 'self';`
- `object-src 'none';`
- `form-action 'self';`

Hinweis zur Einbettung:

- `frame-ancestors` ist aktuell nicht gesetzt.

Hinweis:

- JSON-LD bleibt als nicht-ausführender Script-Block im HTML eingebettet.
- UI-Motion und Scroll-Lock laufen ohne Inline-`style`-Attribute.
- Durch die hash-basierte Astro-CSP ohne `unsafe-inline` werden Inline-Style-Attribute blockiert.

Optionale Browser-Konsole-Prüfung:

```js
const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
console.log(cspMeta?.content ?? 'Kein CSP-Meta-Tag gefunden');
```

---

## Befehle

Alle Befehle werden im Projekt-Root in einem Terminal ausgeführt:

| Befehl                    | Aktion                                              |
| :------------------------ | :-------------------------------------------------- |
| `npm install`             | Installiert Abhängigkeiten                          |
| `npm run dev`             | Startet den lokalen Dev-Server auf `localhost:4321` |
| `npm run build`           | Baut die Produktionsseite nach `./dist/`            |
| `npm run preview`         | Preview des Builds lokal vor dem Deploy             |
| `npm run format`          | Formatiert das Projekt (Prettier)                   |
| `npm run format:check`    | Prüft Formatierung (CI-geeignet)                    |
| `npm run lint`            | Linting (ESLint)                                    |
| `npm run lint:fix`        | Linting + Auto-Fixes (ESLint)                       |
| `npm run check`           | Type-/Template-Check (Astro)                        |
| `npm run test`            | Unit-Tests (Vitest)                                 |
| `npm run test:e2e`        | End-to-End-Tests (Playwright)                       |
| `npm run astro ...`       | CLI-Befehle wie `astro add`, `astro check`          |
| `npm run astro -- --help` | Hilfe zur Astro-CLI anzeigen                        |

---

## Qualität & CI

Das Repository enthält Quality-Gates, damit Code-Style und Typen stabil bleiben:

- **Format-Check:** `npm run format:check`
- **Linting:** `npm run lint`
- **Type-/Template-Check:** `npm run check` (entspricht `astro check`)
- **End-to-End-Tests:** `npm run test:e2e` (Playwright)
- **Produktionsbuild:** `npm run build`

Empfohlener lokaler Gate-Run:

- `npm run lint && npm run check && npm run build`

Hinweis:

- Kommentare im Code bitte auf Deutsch verfassen (siehe `AGENTS.md`).

In **GitHub Actions** läuft das automatisch bei **Push** und **Pull Requests** über `.github/workflows/quality.yml`.

---

## Lokale Entwicklung

```bash
npm install
npm run dev
```

### API-Hinweis (Statistiken)

Mini-Doku zur Live-Daten-Architektur: `docs/live-data.md`

Die Statistik-Seiten rufen Endpunkte unter `/api/...` auf:

- `/api/summary?metrics=...` (KPI-Übersicht)
- `/api/metrics` (Kategorien/Definitionen)
- `/api/leaderboard?metric=...&limit=...&cursor=...` (Ranglisten / Pagination via Cursor)
- `/api/players?q=...&limit=...` (Autocomplete)
- `/api/player?uuid=...` (Spieler-Detail)
- `/api/cape?uuid=...` (optional, empfohlen: serverseitiger Cape-Cache)

Zusätzlich wird eine Übersetzungsdatei als statisches Asset geladen:

- `/i18n/translations.de.json`

Optionaler Debug-Check für fehlende Übersetzungen in `/statistiken/spieler`:

- In `dev` ist die Konsolen-Ausgabe standardmäßig aktiv.
- In Produktion kann sie gezielt per URL aktiviert werden:
  `/statistiken/spieler?uuid=<UUID>&i18ncheck=1`
- Die Ausgabe erscheint in der Browser-Konsole unter `Übersetzungsprüfung`.

Optionales Live-Debug-Overlay für Home-Live-Kacheln (`mc-online`, `discord-online`):

- Nur in Dev aktivierbar per URL-Flag: `?debugLive=1` (auch `?debugLive` oder `?debugLive=true`).
- Zeigt pro Kachel kompakt: `status`, `age`, `source` (`cache|network`), `error.kind`.
- In Produktion ist das Overlay deaktiviert und wird nicht ins DOM eingefügt.

Lokal brauchst du entweder eine laufende API unter `http://localhost:4321/api/...` (Reverse Proxy) oder du richtest in `astro.config.mjs` einen Dev-Proxy ein (Vite Proxy).

### Empfohlener Cape-Endpoint

Das Frontend versucht beim Skin-Viewer zuerst:

- `/api/cape?uuid=<32-hex-ohne-bindestriche>`

Wenn der Endpoint nicht verfügbar ist (`404/405/501`) oder fehlschlägt, wird automatisch auf den externen Fallback zurückgegriffen.

Empfohlene Response (JSON):

```json
{ "capeUrl": "https://textures.minecraft.net/texture/..." }
```

oder ohne Cape:

```json
{ "capeUrl": null, "hasCape": false }
```

Empfohlene Caching-Strategie im Backend:

- Mit Cape: TTL 6-24h
- Ohne Cape (negative cache): TTL 15-60min
- `Cache-Control` für CDN/Reverse-Proxy setzen (`s-maxage` + `stale-while-revalidate`)

Beispiel für einen Dev-Proxy (optional):

```js
// astro.config.mjs
export default defineConfig({
  vite: {
    server: {
      proxy: {
        '/api': 'http://localhost:8080',
      },
    },
  },
});
```

---

## Deployment

- `npm run build` erzeugt die statische Ausgabe in `dist/`.
- Alles aus `public/` wird 1:1 nach `dist/` kopiert (z. B. `.htaccess`, `favicons/*`, `i18n/*`).
