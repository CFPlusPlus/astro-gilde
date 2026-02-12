<p align="center">
  <a href="https://minecraft-gilde.de" target="_blank" rel="noopener noreferrer">
    <img src="./src/assets/images/branding/logo-big.webp" alt="Minecraft Gilde" width="360" />
  </a>
</p>

<p align="center">
  <a href="https://discord.minecraft-gilde.de" target="_blank" rel="noopener noreferrer">
    <img alt="Discord" src="https://img.shields.io/discord/1219625244906754093?label=Discord&logo=discord&logoColor=white" />
  </a>
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

- Inline-Skripte in `.astro` nach Moeglichkeit vermeiden.
- Frueher Theme-/Config-Bootstraps wurden auf externe Dateien bzw. `data-*` Attribute verlagert.
- Fachlogik, DOM-Logik und Event-Handling liegen in `src/scripts/*`.
- Seiten/Komponenten importieren diese Skripte nur noch ueber kurze Bootstrap-Imports.
- Keine grossen JS-Bloecke direkt in `src/pages/*`.

---

## Content Security Policy (CSP)

Die Seite liefert eine aktive CSP ueber Astro `experimental.csp` (siehe `astro.config.mjs`).
Fuer prerenderte Seiten wird die Policy als Meta-Tag mit Hashes erzeugt, damit auch Astro-interne Inline-Runtime-Skripte sauber abgedeckt sind.

Aktuelle Policy:

- `default-src 'self';`
- `img-src 'self' data: https:;`
- `style-src 'self' 'unsafe-inline';`
- `script-src 'self';`
- `connect-src 'self' https:;`
- `base-uri 'self';`
- `object-src 'none';`
- `frame-ancestors 'self';`
- `form-action 'self';`

Hinweis:

- JSON-LD bleibt als nicht-ausfuehrender Script-Block im HTML eingebettet.

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
| `npm run astro ...`       | CLI-Befehle wie `astro add`, `astro check`          |
| `npm run astro -- --help` | Hilfe zur Astro-CLI anzeigen                        |

---

## Qualität & CI

Das Repository enthält Quality-Gates, damit Code-Style und Typen stabil bleiben:

- **Format-Check:** `npm run format:check`
- **Linting:** `npm run lint`
- **Type-/Template-Check:** `npm run check` (entspricht `astro check`)
- **Unit-Tests:** `npm run test` (Vitest)

In **GitHub Actions** läuft das automatisch bei **Push** und **Pull Requests** über `.github/workflows/quality.yml`.

---

## Lokale Entwicklung

```bash
npm install
npm run dev
```

### API-Hinweis (Statistiken)

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

Lokal brauchst du entweder eine laufende API unter `http://localhost:4321/api/...` (Reverse Proxy) oder du richtest in `astro.config.mjs` einen Dev-Proxy ein (Vite Proxy).

### Empfohlener Cape-Endpoint

Das Frontend versucht beim Skin-Viewer zuerst:

- `/api/cape?uuid=<32-hex-ohne-bindestriche>`

Wenn der Endpoint nicht verfuegbar ist (`404/405/501`) oder fehlschlaegt, wird automatisch auf den externen Fallback zurueckgegriffen.

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
- `Cache-Control` fuer CDN/Reverse-Proxy setzen (`s-maxage` + `stale-while-revalidate`)

Beispiel fuer einen Dev-Proxy (optional):

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
