# Statistik-API und lokaler Proxy

Mini-Doku für die Endpunkte, die das Frontend unter `/statistiken` nutzt.

## Verwendete Endpunkte

- `/api/summary?metrics=...` (KPI-Übersicht)
- `/api/metrics` (Kategorien/Definitionen)
- `/api/leaderboard?metric=...&limit=...&cursor=...` (Ranglisten mit Cursor-Paging)
- `/api/players?q=...&limit=...` (Autocomplete)
- `/api/player?uuid=...` (Spieler-Detail)
- `/api/cape?uuid=...` (optional, serverseitiger Cape-Cache)
- `/i18n/translations.de.json` (statisches i18n-Asset)

## API-Basis im Frontend

Die API-URLs werden über `minecraftGilde.apiOrigin` und `toApiUrl(...)` gebaut.
Damit ist lokal und produktiv dasselbe Frontend nutzbar.

## Lokale Entwicklung

Entweder:

- API direkt unter derselben Origin bereitstellen (z. B. Reverse Proxy), oder
- einen Dev-Proxy in `astro.config.mjs` konfigurieren.

Beispiel:

```js
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

## Debug-Hinweise

- Fehlende Übersetzungen in `/statistiken/spieler`:
  - Dev: Konsolen-Check aktiv
  - Produktion: `?uuid=<UUID>&i18ncheck=1`
- Live-Overlay für Home-Kacheln (`mc-online`, `discord-online`):
  - Nur in Dev via `?debugLive=1` (auch `?debugLive` oder `?debugLive=true`)

## Cape-Endpoint (empfohlen)

Primarer Abruf für den Skin-Viewer:

- `/api/cape?uuid=<32-hex-ohne-bindestriche>`

Wenn der Endpoint nicht verfügbar ist (`404/405/501`) oder fehlschlägt, greift das Frontend auf den externen Fallback zurück.

Empfohlene Responses:

```json
{ "capeUrl": "https://textures.minecraft.net/texture/..." }
```

```json
{ "capeUrl": null, "hasCape": false }
```

Empfohlenes Caching im Backend:

- Mit Cape: TTL 6-24h
- Ohne Cape: TTL 15-60min
- `Cache-Control` für CDN/Proxy setzen (`s-maxage` + `stale-while-revalidate`)
