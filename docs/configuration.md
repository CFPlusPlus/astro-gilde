# Konfiguration und Umgebungsvariablen

Diese Seite beschreibt die zentrale Projektkonfiguration und wie Werte zur Laufzeit im Browser landen.

## Relevante Dateien

- `src/config/minecraftGilde.ts`
- `src/config/site.ts`
- `src/scripts/app-config.ts`
- `src/lib/http/apiUrl.ts`
- `astro.config.mjs`
- `scripts/check-config-drift.mjs`

## Zentrale Konfiguration (`minecraftGilde`)

In `src/config/minecraftGilde.ts` werden zentrale Projektwerte gepflegt:

- Brand-Informationen (`name`, `alternateName`, `defaultMetaDescription`, `logo`, `sameAs`)
- Server-/Community-Links (`discord`, `map`, `status`, Voting-Links)
- Serverdaten (`serverIp`, `mcVersion`)
- API-Ursprung (`apiOrigin`)
- optionales Repository (`repoUrl`)

## Umgebungsvariable `PUBLIC_API_ORIGIN`

`apiOrigin` wird wie folgt ermittelt:

- Primär: `import.meta.env.PUBLIC_API_ORIGIN`
- Fallback: `/api`
- Danach: Entfernen von abschließenden `/` per `.replace(/\/+$/, '')`

Dadurch bleiben API-URLs stabil, unabhängig davon, ob der Env-Wert mit oder ohne Trailing Slash gesetzt ist.

## API-URL-Auflösung im Frontend

`src/lib/http/apiUrl.ts` baut aus einem Pfad eine Ziel-URL:

- Eingaben mit und ohne führendes `/` sind erlaubt.
- Ein vorhandenes `/api/`-Präfix wird entfernt.
- Ergebnis ist immer `minecraftGilde.apiOrigin + <Pfad ohne /api>`

Beispiel:

- Input: `/api/summary?metrics=hours`
- Output: `/api/summary?metrics=hours` (oder entsprechender `PUBLIC_API_ORIGIN`)

## Browser-Konfiguration über `data-*`

`browserAppConfig` in `src/config/minecraftGilde.ts` enthält nur browserrelevante, nicht-sensitive Werte:

- `serverIp`
- `discordGuildId`
- `discordInvite`
- `discordInviteCode`
- `dynmapUrl`
- `statusUrl`

Diese Werte werden in `src/layouts/BaseLayout.astro` auf `<html>` als `data-*` Attribute gesetzt und in `src/scripts/app-config.ts` ausgelesen.

Wichtig:

- `readBrowserAppConfig(fallback)` merged `fallback` + Dataset-Werte.
- Leere Strings werden verworfen (`pickString`).

## Site- und Canonical-Konfiguration

`src/config/site.ts` ist die zentrale Stelle für:

- `siteUrl` (z. B. `https://minecraft-gilde.de`)
- normalisierte `site`-URL
- `canonicalFor(pathname)` mit `trailingSlash`-Regel (`always`)

## Drift-Check zwischen `site` und `siteUrl`

`scripts/check-config-drift.mjs` verhindert Konfigurationsdrift:

- liest `site` aus `astro.config.mjs`
- liest `siteUrl` aus `src/config/site.ts`
- normalisiert URLs für Vergleich (ohne Query/Hash, konsistente Trailing-Slash-Logik)

Lokaler Check:

```bash
npm run config:check
```

## Änderungs-Checkliste

1. Bei Domain-/API-Änderungen `minecraftGilde.ts`, `site.ts` und ggf. `astro.config.mjs` gemeinsam prüfen.
2. Danach `npm run config:check` ausführen.
3. Bei API-Ursprung-Änderungen Frontend-Aufrufe unter `src/features/*/api.ts` und `src/lib/http/apiUrl.ts` gegenprüfen.
