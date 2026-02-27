# Content Security Policy (CSP)

Die Seite setzt eine CSP über Astro `experimental.csp` in `astro.config.mjs`.

## Aktuelle Direktiven

- `script-src 'self'` (plus Astro-Hashes für interne Runtime-Skripte)
- `style-src 'self'` (plus Astro-Hashes)
- `default-src 'self'`
- `img-src 'self' data: https:`
- `frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com`
- `connect-src 'self' https:`
- `base-uri 'self'`
- `object-src 'none'`
- `form-action 'self'`

## Hinweise

- `frame-ancestors` ist aktuell nicht gesetzt.
- JSON-LD bleibt als nicht-ausführender Script-Block im HTML.
- Inline-`style`-Attribute werden durch die Policy blockiert.

## Browser-Check (optional)

```js
const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
console.log(cspMeta?.content ?? 'Kein CSP-Meta-Tag gefunden');
```
