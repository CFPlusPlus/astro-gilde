# Statistik-API im Worker

Mini-Doku fuer die API-Endpunkte, die das Frontend unter `/statistiken` nutzt.

## Verwendete Endpunkte

- `/api/summary?metrics=...` (KPI-Uebersicht)
- `/api/metrics` (Kategorien/Definitionen)
- `/api/leaderboard?metric=...&limit=...&cursor=...` (Ranglisten mit Cursor-Paging)
- `/api/leaderboards?limit=...` (Top-Listen je Metrik)
- `/api/players?q=...&limit=...` (Autocomplete)
- `/api/player?uuid=...` (Spieler-Detail)
- `/api/cape?uuid=...` (Cape aus Mojang-Profil)
- `/api/profile?uuid=...` (rohes Mojang-Profil)
- `/i18n/translations.de.json` (statisches i18n-Asset)

## API-Basis im Frontend

Die API-URLs werden ueber `minecraftGilde.apiOrigin` und `toApiUrl(...)` gebaut.
Default bleibt `/api`, damit Frontend und API unter derselben Origin laufen.

## Runtime in Astro

Die Route `src/pages/api/[...path].ts` laeuft serverseitig im Cloudflare Worker
und ruft die MariaDB direkt an (kein Upstream-Proxy mehr auf `api.minecraft-gilde.de`).

Implementierung:

- `src/lib/http/server/statsApiProxy.ts`

## Runtime-Variablen und Secrets

Pflichtwerte fuer DB-Zugriff:

- `STATS_DB_HOST`
- `STATS_DB_NAME`
- `STATS_DB_USER`
- `STATS_DB_PASS` (Secret)

Optionale Werte:

- `STATS_DB_PORT` (Default: `3306`)
- `STATS_DB_CHARSET` (Default: `utf8mb4`)

Optionaler Hyperdrive-Binding:

- `HYPERDRIVE` in `wrangler.toml`

Wenn `HYPERDRIVE` gesetzt ist, werden dessen Verbindungsdaten bevorzugt verwendet.

Wichtig:

- Niemals `PUBLIC_*` fuer DB-Daten nutzen.
- Secrets immer ueber Cloudflare Secrets setzen (`wrangler secret put ...`).

## Caching-Profile

Edge-Cache (`caches.default`) + `Cache-Control`:

- `metrics`: `max-age=3600`
- `summary`: `max-age=60`
- `leaderboard` / `leaderboards`: `max-age=60`
- `players`: `max-age=30`
- `player`: `max-age=60`

Mojang (`cape` / `profile`):

- Positive Treffer: `6h`
- Negative Treffer (`204/404`): `10m`
- Stale bei Upstream-Fehler: `30s`
- Header zusaetzlich: `stale-while-revalidate=30`, `stale-if-error=86400`

## Lokale Entwicklung

- `npm run dev` fuer Astro
- `npm run dev:worker` fuer Worker-Runtime mit Wrangler
- `.dev.vars` mit DB-Werten aus `.dev.vars.example`

Damit ist die komplette Statistik-API lokal unter `http://localhost:8787/api/...` testbar.
