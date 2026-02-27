# Live-Daten Architektur und Zustände

Diese Mini-Doku erklärt in 2-3 Minuten, wie Live-Daten im Projekt funktionieren.

## 1) Schnellüberblick

Es gibt zwei relevante Live-Daten-Pfade:

1. Home Live Counter (`src/scripts/app/live-counters.ts`)
2. Statistik-KPI Summary (`src/features/stats/hooks/useStatsData.ts`)

Beide nutzen das gemeinsame Cache-Modul `src/lib/live/cache.ts` und gemeinsame Live-States aus `src/lib/live/types.ts`.

## 2) State Model

Zentrale States (`LiveDataStatus` in `src/lib/live/types.ts`):

- `loading`: Noch keine verwertbaren Daten verfügbar.
- `ok`: Erfolgreiche Antwort mit Daten.
- `empty`: Erfolgreiche Antwort, aber "0/leer" als fachlich gültiges Ergebnis.
- `stale`: Es gibt noch alte Daten, aber Revalidierung läuft oder ist fehlgeschlagen.
- `error`: Kein nutzbarer Stand verfügbar.

Fehlerarten (`LiveDataErrorKind`):

- `network`
- `timeout`
- `rate_limit`
- `invalid`
- `unknown`

Wichtig: `stale` bedeutet bewusst "alte Daten zeigen statt hart auszufallen".

## 3) Cache-Strategie

Implementierung in `src/lib/live/cache.ts`:

- Zweistufiger Cache:
  - In-Memory Map (schnell innerhalb der Session)
  - Optional `localStorage` (`persist: true`)
- Nur `ok` und `empty` werden persistiert.
- Deduplizierung paralleler Requests über `inFlightRequests` pro Cache-Key.

Alterung:

- `staleAfterMs`: Danach wird ein Cache-Eintrag als `stale` markiert.
- `maxCacheAgeMs`: Danach wird der Eintrag verworfen.

Standardwerte pro Widget (`LIVE_WIDGET_THRESHOLDS` in `src/lib/live/types.ts`):

- `mc-online`: stale nach 60s, max 30min
- `discord-online`: stale nach 60s, max 30min
- `discord-members`: stale nach 5min, max 60min
- `stats-kpi`: stale nach 5min, max 60min

Fallback-Verhalten:

- Wenn Revalidierung fehlschlägt, aber Cache noch nicht zu alt ist:
  - Rückgabe als `stale` inkl. Fehlerinfo.
- Wenn Cache zu alt und Fetch fehlschlägt:
  - Rückgabe `error`.

## 4) Retry- und Rate-Limit-Handling

### Home Live Counter (`src/scripts/app/live-counters.ts`)

- Timeout je Request: `6_500ms` (via `src/lib/live/fetchJson.ts`).
- Automatischer Retry bei `network`/`timeout`:
  - Basis: 1s
  - maximal 1 Wiederholungsversuch
- `429` wird als `rate_limit` klassifiziert.
- `Retry-After` Header wird ausgewertet (Sekunden oder HTTP-Datum).
- Für Live-Tiles mit Retry-Button:
  - Manuelles Revalidate ist während Cooldown/Busy gesperrt.
  - Debounce für manuelle Revalidierung: 2s.

### Statistik-KPI Summary (`src/features/stats/hooks/useStatsData.ts`)

- Nutzt `getLiveResource(...)` für Cache + Revalidierung.
- Kein separates Auto-Retry-Backoff wie bei Home-Countern.
- User-Flow "Erneut laden" triggert neue Revalidierung über `retrySummary`.

## 5) Wo Endpoints konfiguriert werden

### A) Home Live Counter Quellen

Quellwerte kommen aus `src/config/minecraftGilde.ts` (Export `browserAppConfig`) und werden in `src/layouts/BaseLayout.astro` als `data-*` Attribute am `<html>` gesetzt.

Gelesen werden sie in `src/scripts/app-config.ts`.

Relevante Felder:

- `serverIp` -> Minecraft Status API
- `discordGuildId` -> Discord Widget API
- `discordInviteCode` -> Discord Invite API

### B) Statistik-Endpunkte

Frontend ruft relative Endpunkte auf:

- `src/features/stats/api.ts` (`/api/summary`, `/api/metrics`, `/api/leaderboard`, `/api/players`)
- `src/features/stats-core/api.ts` (`/api/player`)

Das Zielsystem hinter `/api/...` wird über Infrastruktur geregelt (Reverse Proxy / Dev-Proxy), nicht in diesen Frontend-Dateien.

Siehe auch `docs/stats-api.md` für Endpunkte und lokales Proxy-Setup.

## 6) Änderungen sicher durchführen

Wenn du Live-Daten anpasst, prüfe mindestens:

1. Passende Thresholds in `src/lib/live/types.ts`
2. Gewünschten Cache-Key/Prefix (`src/lib/live/cache.ts` und Aufrufer)
3. Fehler- und Retry-Verhalten im UI (`src/scripts/app/live-counters.ts` oder Stats Hooks)
