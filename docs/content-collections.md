# Content-Collections und Datenformate

Diese Seite dokumentiert die aktiven Astro Content Collections und die erwarteten Datenstrukturen.

## Relevante Dateien

- `src/content/config.ts`
- `src/content/commands/list.json`
- `src/content/rules/main.json`
- `src/content/faq/main.json`
- `src/content/tutorial/*.md`

## Überblick

Definiert sind vier Collections:

- `commands` (`type: 'data'`)
- `rules` (`type: 'data'`)
- `faq` (`type: 'data'`)
- `tutorial` (`type: 'content'`)

## Schema: `commands`

Datei: `src/content/commands/list.json`

Erwartete Struktur:

- `categories`: Array
- jede Kategorie:
  - `name`: string
  - `commands`: Array
    - `command`: string
    - `description`: string

## Schema: `rules`

Datei: `src/content/rules/main.json`

Erwartete Struktur:

- `serverIp`: string (optional)
- `warning`: string
- `minecraft`: Objekt mit
  - `title`: string
  - `items`: Array `{ title: string, html: string }`
- `discord`: Objekt mit
  - `title`: string
  - `items`: Array `{ title: string, html: string }`

Hinweis:

- `html` wird als String gepflegt. Inhalte müssen sauber escaped und redaktionell geprüft sein.

## Schema: `faq`

Datei: `src/content/faq/main.json`

Erwartete Struktur: Array von Kategorien

- `title`: string
- `icon`: Enum `BookOpen | Hammer | Shield | Cpu`
- `items`: Array
  - `q`: string
  - `a`: string

## Schema: `tutorial`

Dateien: `src/content/tutorial/*.md`

Frontmatter-Felder:

- `order`: positive ganze Zahl
- `title`: string
- `icon`: Enum `Wand | Shield | Hammer | UserRound | Map | Vote`
- `meta`: string
- `open`: boolean (optional)
- `actions`: optionales Array
  - `label`: string
  - `target`: Enum `rules | commands | vote | dynmap | discord`
  - `variant`: Enum `primary | secondary | ghost`
  - `icon`: optionales Enum `ArrowRight | Shield | Hammer | Map | Vote`

## Validierung

Schema-Verstöße werden über Astro Check sichtbar.

Lokaler Check:

```bash
npm run check
```

## Änderungs-Checkliste

1. Strukturänderungen immer zuerst in `src/content/config.ts` planen.
2. Bestehende Enum-Werte respektieren oder gezielt erweitern.
3. Nach Änderungen mindestens `npm run check` ausführen.
