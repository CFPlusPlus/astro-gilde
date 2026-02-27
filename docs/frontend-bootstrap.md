# Frontend-Bootstrap und Ladeverhalten

Diese Seite beschreibt, wie Browserlogik initialisiert und bei Astro Page-Transitions sauber wieder aufgeräumt wird.

## Relevante Dateien

- `src/layouts/BaseLayout.astro`
- `src/scripts/app.ts`
- `src/scripts/app-home.ts`
- `src/scripts/app-config.ts`
- `src/scripts/theme-color-sync.ts`

## Einstiegspunkt im Layout

`BaseLayout.astro` bindet globale Skripte ein:

- `<script is:inline src="/theme-bootstrap.js"></script>`
- Modulimport für `src/scripts/theme-color-sync.ts`
- Modulimport für `src/scripts/app.ts`
- Modulimport für `src/scripts/email-obfuscate.ts`

Zusätzlich setzt das Layout `data-*` Attribute auf `<html>`, die später in `app-config.ts` gelesen werden.

## Lifecycle in `app.ts`

`src/scripts/app.ts` nutzt zwei Astro-Events:

- `astro:page-load` -> mount
- `astro:before-swap` -> unmount

Dadurch funktioniert die Initialisierung sowohl beim ersten Seitenaufruf als auch bei Navigationen über Astro.

## Globale Initialisierung

Beim Mount werden zuerst immer geladen:

- `readBrowserAppConfig({})`
- `initToast(...)`
- `initTheme(...)`
- `initNavMenu(...)`

Alle Cleanups werden gesammelt und beim Unmount ausgeführt.

## Bedingtes Lazy-Loading nach DOM-Targets

`app.ts` lädt Module nur, wenn passende Elemente vorhanden sind:

- `[data-motion]` -> `./app/motion`
- `[data-mc-online], [data-discord-online], [data-discord-members]` -> `./app/live-counters`
- `[data-join-modal], [data-copy-ip], [data-copy-ip-inline]` -> `./app/join-modal`
- `[data-home]` -> `./app-home`

Das reduziert unnötigen JavaScript-Load auf Seiten, die bestimmte Features nicht brauchen.

## Schutz vor Race Conditions

`mountRunId` verhindert, dass verspätet geladene Imports eine bereits ersetzte Seite initialisieren.

Prinzip:

- Jede Mount-Iteration erhöht `mountRunId`.
- Asynchrone Imports prüfen, ob ihr `runId` noch aktuell ist.
- Stale-Mounts führen direkt ihren Cleanup aus.

## Home-spezifisches Bootstrap

`src/scripts/app-home.ts` initialisiert:

- `initHomeGallery()`
- `initHomeQuickNav()`
- `initHomePlayers()`
- `initHomeWorldAge()`

Cleanup gibt gestoppte Observer/Listener zurück (für Gallery, QuickNav, Players).

## Theme-Color-Sync

`src/scripts/theme-color-sync.ts` hält `<meta name="theme-color">` synchron mit CSS-Variable `--bg`.

Wichtig:

- eigener Mount/Unmount pro Astro-Transition
- Singleton-State unter `window.__MG_THEME_COLOR_SYNC_STATE__`
- verhindert doppelte Event-Handler bei wiederholtem Mounten

## Änderungs-Checkliste

1. Neue Feature-Skripte in `app.ts` nur selektorbasiert lazy laden.
2. Für jedes Initialisierungsmodul Cleanup sicherstellen.
3. Navigation zwischen Seiten testen (nicht nur Hard Reload), damit Transition-Cleanup greift.
