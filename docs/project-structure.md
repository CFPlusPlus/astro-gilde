# Projektstruktur und Frontend-Konventionen

Diese Datei beschreibt die wichtigsten Bereiche im Repository.

## Verzeichnis-Übersicht

```text
/
|- public/          # Statische Dateien (z. B. favicons, i18n, .htaccess)
|- scripts/         # Build-Helfer
|- src/
|  |- components/   # Wiederverwendbare UI-Komponenten
|  |- content/      # Redaktionelle Inhalte (Regeln, Befehle, FAQ, Tutorial)
|  |- features/     # Feature-Module (z. B. stats, player-stats)
|  |- layouts/      # Astro-Layouts
|  |- pages/        # Routen/Seiten
|  |- scripts/      # Browserseitige App-Logik
|  |- lib/          # Geteilte Hilfslogik
|  |- config/       # Laufzeit-Konfiguration
|  `- utils/        # Utility-Funktionen
`- docs/            # Projektdokumentation
```

## Frontend-Konventionen

- Inline-Skripte in `.astro` möglichst vermeiden.
- Browser-Logik in `src/scripts/*` oder `src/features/*` halten.
- Seiten sollen Skripte nur schlank bootstrappen.
- Keine großen JS-Blöcke direkt in `src/pages/*`.
