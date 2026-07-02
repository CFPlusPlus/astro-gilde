# Startseiten-Meldung

Die Startseite kann oben im Hero eine wichtige Meldung anzeigen, z. B. bei Ausfall, Wartung oder kurzfristigen Hinweisen für Spieler ohne Discord.

## Pflegeort

Die Meldung wird in `src/data/homeAlert.ts` gepflegt.

Zum Aktivieren oder Deaktivieren:

```ts
enabled: true,
```

- `true`: Meldung wird angezeigt.
- `false`: Meldung wird komplett ausgeblendet.

## Varianten

```ts
variant: 'warning',
```

Mögliche Werte:

- `'warning'`: dringende Störung, Ausfall, Wartung oder Sicherheitsmeldung.
- `'info'`: neutraler Hinweis, geplante Änderung oder allgemeine Ankündigung.

## Inhalte

Die wichtigsten Textfelder:

- `eyebrow`: kurze Kategorie, z. B. `Wichtige Meldung`, `Wartung`, `Hinweis`.
- `title`: Hauptmeldung, kurz und klar halten.
- `message`: Details für Spieler ohne Discord.
- `updatedAt`: optionaler Stand der Meldung. Entfernen, wenn kein Datum angezeigt werden soll.

## Buttons

Buttons werden über `actions` gepflegt:

```ts
actions: [
  {
    label: 'Status ansehen',
    href: minecraftGilde.statusUrl,
    external: true,
  },
],
```

- `label`: sichtbarer Button-Text.
- `href`: Ziel-URL oder interner Pfad.
- `external: true`: für externe Links setzen.

Ein leeres Array blendet Buttons aus:

```ts
actions: [],
```

## Technische Einbindung

- `src/components/home/HomeAlertBanner.astro` rendert die Box.
- `src/components/home/sections/HomeHero.astro` platziert die Box oben im Hero.
- `src/components/home/HomePage.astro` übergibt `homeAlert` an den Hero.

Die Box liegt im Hero, damit das Startseiten-Hintergrundbild auch mobil bis nach oben sichtbar bleibt.

## Prüfung nach Änderungen

Nach Text- oder Konfigurationsänderungen mindestens ausführen:

```bash
npm run check
```

Bei Layout-Änderungen zusätzlich:

```bash
npm run format:check
```
