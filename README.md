<p align="center">
  <a href="https://minecraft-gilde.de" target="_blank" rel="noopener noreferrer">
    <img src="https://minecraft-gilde.de/images/logo-big.webp" alt="Minecraft Gilde" width="360" />
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

> Hinweis: In den Regeln werden Abschnitte als HTML-Strings gespeichert (z. B. für Formatierung/Listen). Bitte entsprechend sauber escapen.

---

## Projektstruktur (Auszug)

```text
/
├── public/
│   ├── images/
│   └── js/
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
| `npm run astro ...`       | CLI-Befehle wie `astro add`, `astro check`          |
| `npm run astro -- --help` | Hilfe zur Astro-CLI anzeigen                        |

---

## Qualität & CI

Das Repository enthält Quality-Gates, damit Code-Style und Typen stabil bleiben:

- **Format-Check:** `npm run format:check`
- **Linting:** `npm run lint`
- **Type-/Template-Check:** `npm run check` (entspricht `astro check`)

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

Zusätzlich wird eine Übersetzungsdatei als statisches Asset geladen:

- `/js/translations.de.json`

Lokal brauchst du entweder eine laufende API unter `http://localhost:4321/api/...` (Reverse Proxy) oder du richtest in `astro.config.mjs` einen Dev-Proxy ein (Vite Proxy).

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
- Alles aus `public/` wird 1:1 nach `dist/` kopiert (z. B. `.htaccess`, `robots.txt`).
