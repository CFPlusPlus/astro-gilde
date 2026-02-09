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

## Qualitaet vor Abschluss

- Nach Aenderungen, wenn sinnvoll, lokal pruefen:
- `npm run format:check`
- `npm run lint`
- `npm run check`
- `npm run test`
- Bei Build-/Routing-/Asset-Aenderungen zusaetzlich:
- `npm run build`
- Bei rein kleinen Text-/Markup-Aenderungen mindestens:
- `npm run check`

## Antwortformat fuer Agenten

- Kurz zusammenfassen, was geaendert wurde.
- Betroffene Dateien konkret nennen.
- Falls etwas nicht verifiziert wurde, klar benennen.
