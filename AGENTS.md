# AGENTS.md

Leitfaden fuer KI-Agenten in diesem Repository.

## Ziel

- Kleine, praezise Aenderungen bevorzugen.
- Bestehende Struktur und Stil beibehalten.
- Keine ungefragten Refactors oder Umstrukturierungen.

## Stack und Kontext

- Framework: Astro (statische Seite)
- Sprache: TypeScript (strict)
- Styling: Tailwind CSS
- Interaktivitaet: React (Astro Islands)
- Tests: Vitest
- Laufzeit: Node.js >= 22

## Projekt-Setup

- Abhaengigkeiten installieren: `npm install`
- Lokale Entwicklung starten: `npm run dev`
- Produktionsbuild lokal pruefen: `npm run build`

## Relevante Bereiche

- `src/pages/` fuer Seiten
- `src/layouts/` fuer Layouts
- `src/components/` fuer UI-Komponenten
- `src/features/` fuer Feature-Module (z. B. Statistiken)
- `src/content/` fuer Inhalte (Regeln, Befehle, Tutorial)
- `src/scripts/` fuer Browser-Logik (z. B. `app.ts`, `app-home.ts`)
- `public/` fuer statische Dateien und Server-Konfig (z. B. `.htaccess`)
- `scripts/` fuer Build-Helfer (z. B. `postbuild-404.mjs`)

## Arbeitsregeln

- Nur aendern, was zur Aufgabe gehoert.
- Keine Secrets, Tokens oder Zugangsdaten in Code/Repo schreiben.
- Bestehende Namenskonventionen und Dateistruktur einhalten.
- Kommentare im Code auf Deutsch verfassen.
- Kommentare nur dort setzen, wo sie wirklich zum Verstaendnis beitragen.
- Integrationen bevorzugt ueber `astro add` installieren statt rein manuell.

## Rueckfragepflicht

- Vor Aenderungen an `src/content/`-Schemas oder Struktur immer Rueckfrage.
- Vor neuen Abhaengigkeiten immer Rueckfrage.
- Vor groesseren Refactors immer Rueckfrage.

## Qualitaet vor Abschluss

- Standard (Code- und Logikaenderungen):
  - `npm run format:check`
  - `npm run lint`
  - `npm run check`
  - `npm run test`
- Bei Build-/Routing-/Asset-Aenderungen zusaetzlich:
  - `npm run build`
- Bei kleinen Text-/Markup-Aenderungen mindestens:
  - `npm run check`

## Architektur-Hinweise

- Seiten liegen in `src/pages/`, Layouts in `src/layouts/`, UI-Komponenten in `src/components/`.
- Feature-Logik liegt in `src/features/`; browserseitige Logik in `src/scripts/`.
- Inhalte in `src/content/` sind redaktionell und strukturell stabil zu behandeln.

## Antwortformat fuer Agenten

- Kurz zusammenfassen, was geaendert wurde.
- Betroffene Dateien konkret nennen.
- Falls etwas nicht verifiziert wurde, klar benennen.
