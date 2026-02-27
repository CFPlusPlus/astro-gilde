# SEO, Canonical und strukturierte Daten

Diese Seite beschreibt die aktuelle SEO-Basis im Projekt: Canonical-URLs, Meta-Tags und JSON-LD.

## Relevante Dateien

- `src/layouts/BaseLayout.astro`
- `src/config/site.ts`
- `src/lib/structuredData.ts`
- `src/components/seo/JsonLd.astro`
- `src/pages/robots.txt.ts`

## Canonical-Strategie

`src/config/site.ts` ist die zentrale Canonical-Quelle:

- `siteUrl` als Basisdomain
- `canonicalFor(pathname)` für konsistente absolute URLs
- aktuell mit Trailing Slash (`canonicalTrailingSlash = 'always'`)

`BaseLayout.astro` nutzt:

- expliziten Prop `canonical` oder
- fallback auf `Astro.url.pathname`

und setzt dann `<link rel="canonical" ...>`.

## Meta-Tags aus dem Layout

`BaseLayout.astro` setzt standardmäßig:

- `title`, `description`, optionale `keywords`/`author`
- `robots` (`index, follow` oder bei `noindex=true` -> `noindex, nofollow`)
- OpenGraph-Tags (`og:title`, `og:description`, `og:url`, `og:image`, ...)
- Twitter-Tags (`twitter:card`, `twitter:title`, `twitter:description`, ...)

Zusätzlich:

- `<link rel="sitemap" href="/sitemap-index.xml">`
- Theme-Color, Favicon/PWA-Metadaten

## Globale JSON-LD-Basis

`buildBaseGraph(...)` aus `src/lib/structuredData.ts` erzeugt einen Graph mit:

- `WebSite`
- `Organization`
- `WebPage`
- optional `BreadcrumbList` (nicht auf `/` und `/404/`)

Die Ausgabe wird über `JsonLd.astro` im Head eingebunden.

## Seitenspezifische JSON-LD-Typen

Aktuell verwendete Builder:

- `buildFaqPage` in `src/pages/faq.astro`
- `buildHowTo` in `src/pages/voten.astro` und `src/pages/tutorial.astro`
- `buildArticle` in `src/pages/geschichte.astro` und `src/pages/serverinfos.astro`
- `buildGameServer` in `src/pages/serverinfos.astro`

## Robots

`src/pages/robots.txt.ts` ist prerendered und liefert:

- `User-agent: *`
- `Allow: /`
- Sitemap-Link auf `/sitemap-index.xml`

Basis-URL kommt aus `Astro.site`, fallback auf `siteUrl`.

## Änderungs-Checkliste

1. Neue Seite: Canonical mit `canonicalFor(...)` prüfen.
2. Für SEO-relevante Seiten passenden JSON-LD-Typ ergänzen.
3. OG/Twitter-Bild als absolute URL sicherstellen (über Layoutlogik).
4. Nach Domainänderung `siteUrl` und `astro.config.mjs` gemeinsam prüfen.
