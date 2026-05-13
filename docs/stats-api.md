# Statistik-API im Worker

Mini-Doku für die API-Endpunkte, die das Frontend unter `/statistiken` nutzt.

## Verwendete Endpunkte

- `/api/summary?metrics=...` (KPI-Übersicht)
- `/api/metrics` (Kategorien/Definitionen)
- `/api/leaderboard?metric=...&limit=...&cursor=...` (Ranglisten mit Cursor-Paging)
- `/api/leaderboards?limit=...` (Top-Listen je Metrik)
- `/api/world-state` (globaler Weltzustand, aktuell Weltalter)
- `/api/players?q=...&limit=...` (Autocomplete)
- `/api/player?uuid=...` (Spieler-Detail)
- `/api/ban-status?query=...` (Bann-Status per exaktem Name oder UUID)
- `/api/cape?uuid=...` (Cape aus Mojang-Profil)
- `/api/profile?uuid=...` (rohes Mojang-Profil)
- `/i18n/translations.de.json` (statisches i18n-Asset)

## API-Basis im Frontend

Die API-URLs werden über `minecraftGilde.apiOrigin` und `toApiUrl(...)` gebaut.
Default bleibt `/api`, damit Frontend und API unter derselben Origin laufen.

## Runtime in Astro

Die Route `src/pages/api/[...path].ts` läuft serverseitig im Cloudflare Worker
und ruft die MariaDB direkt an (kein Upstream-Proxy mehr auf `api.minecraft-gilde.de`).

Implementierung:

- `src/lib/http/server/statsApiProxy.ts`

## Runtime-Variablen und Secrets

Pflichtwerte für DB-Zugriff:

- `STATS_DB_HOST`
- `STATS_DB_NAME`
- `STATS_DB_USER`
- `STATS_DB_PASS` (Secret)

Optionale Werte:

- `STATS_DB_PORT` (Default: `3306`)
- `STATS_DB_CHARSET` (Default: `utf8mb4`)

Optionaler Hyperdrive-Binding:

- `hyperdrive` in `wrangler.jsonc`

Wenn `HYPERDRIVE` gesetzt ist, werden dessen Verbindungsdaten bevorzugt verwendet.
Für die lokale Cloudflare-Runtime braucht Hyperdrive zusätzlich eine lokale Verbindungszeichenfolge:

- `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`

Wichtig: Diese Variable in `.dev.vars` allein reicht lokal nicht immer aus,
weil der Hyperdrive-Check bereits vor dem Laden der Worker-Runtime greift.
In der Praxis die Variable daher besser vor dem Start als Shell-Umgebungsvariable
setzen.

Im Repository ist Hyperdrive auf Top-Level hinterlegt. Lokal kann weiterhin
alternativ über `STATS_DB_*` in `.dev.vars` gegen eine eigene DB gearbeitet
werden.

Beispiel für MariaDB/MySQL:

```text
mysql://stats_user:bitte_ändern@127.0.0.1:3306/stats
```

Wichtig:

- Niemals `PUBLIC_*` für DB-Daten nutzen.
- Secrets immer über Cloudflare Secrets setzen (`wrangler secret put ...`).

## Caching-Profile

Edge-Cache (`caches.default`) + `Cache-Control`:

- `metrics`: `max-age=3600`
- `summary`: `max-age=60`
- `world-state`: `max-age=60`
- `leaderboard` / `leaderboards`: `max-age=60`
- `players`: `max-age=30`
- `player`: `max-age=60`
- `ban-status`: `max-age=60`, serverseitig auf 8 Abfragen pro Minute und IP limitiert

Rate-Limit:

- `/api/ban-status`: 8 Abfragen pro 60 Sekunden und IP-Adresse
- Bei Überschreitung: `429 Too Many Requests` mit `Retry-After`

Mojang (`cape` / `profile`):

- Positive Treffer: `6h`
- Negative Treffer (`204/404`): `10m`
- Stale bei Upstream-Fehler: `30s`
- Header zusätzlich: `stale-while-revalidate=30`, `stale-if-error=86400`

## Zeitwerte

Alle Importer-Zeitwerte aus der Datenbank werden von der API als UTC interpretiert
und eindeutig als ISO-8601 mit `Z` ausgegeben, z. B. `2026-05-13T12:00:00Z`.
Das Frontend formatiert diese absoluten Zeitpunkte anschliessend in der
Browser-Zeitzone des Users.

Alte, vor dem UTC-Vertrag gespeicherte `DATETIME`-Werte muessen ausserhalb der
API migriert oder durch einen neuen Import ersetzt werden.

## Weltzustand

`GET /api/world-state`

Liefert den globalen Zustand des aktiven Import-Snapshots. Aktuell nutzt der
Endpunkt die View `v_world_state` und gibt das vorberechnete Weltalter aus.
Das Frontend soll `world.ageDays` direkt anzeigen und keine eigene Umrechnung
von Ticks in Minecraft-Tage vornehmen.

Antwort:

```json
{
  "world": {
    "name": "world",
    "ageTicks": 123456789,
    "ageDays": 5144,
    "importedAt": "2026-05-09T10:34:56Z"
  },
  "__generated": "2026-05-09T10:34:56Z",
  "__generated_timezone": "UTC"
}
```

Felder:

- `world.name`: Name der Minecraft-Welt, z. B. `world`
- `world.ageTicks`: Rohwert aus Bukkit/Paper `World#getFullTime()`
- `world.ageDays`: fertig berechnete Minecraft-Tage aus der Datenbank
- `world.importedAt`: Import-Zeitpunkt des Weltzustands

Wenn kein Weltzustand im aktiven Snapshot vorhanden ist, wird `world: null`
zurueckgegeben.

## Lokale Entwicklung

- `npm run dev` für Astro + Cloudflare-Worker-Runtime
- `.dev.vars` mit DB-Werten aus `.dev.vars.example`
- für lokales Hyperdrive zusätzlich
  `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`

Damit ist die komplette Statistik-API lokal unter `http://localhost:4321/api/...` testbar.

## Mit und ohne API lokal testen

Mit lokaler API (empfohlen):

```bash
cp .dev.vars.example .dev.vars
# .dev.vars befüllen
npm run dev
```

PowerShell:

```powershell
$env:CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="mysql://<user>:<pass>@<host>:3306/<db>?sslMode=REQUIRED"
npm run dev
```

Ohne lokale API (nur Frontend):

```bash
npm run dev
```

Ohne lokale API, aber mit externem API-Ziel:

```bash
PUBLIC_API_ORIGIN=https://<dein-api-host> npm run dev
```

Produktionsnahe Vorschau:

```bash
npm run build
npm run preview
```
