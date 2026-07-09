import { minecraftGilde } from '../config/minecraftGilde';

// Varianten:
// - 'warning': dringende Stoerung, Ausfall, Wartung oder Sicherheitsmeldung.
// - 'info': neutraler Hinweis, geplante Aenderung oder allgemeine Ankuendigung.
export type HomeAlertVariant = 'info' | 'warning';

export interface HomeAlertAction {
  label: string;
  href: string;
  external?: boolean;
}

export interface HomeAlert {
  enabled: boolean;
  variant: HomeAlertVariant;
  eyebrow: string;
  title: string;
  message: string;
  updatedAt?: string;
  actions: HomeAlertAction[];
}

export const homeAlert: HomeAlert = {
  // Schnellschalter: false blendet die Meldung komplett aus.
  enabled: false,

  // Siehe HomeAlertVariant oben. Fuer Ausfaelle normalerweise 'warning' nutzen.
  variant: 'warning',

  // Kurze Kategorie in Grossbuchstabenoptik, z. B. "Wartung", "Update" oder "Hinweis".
  eyebrow: 'Eilmeldung',

  // Klare Hauptmeldung. Kurz halten, damit sie auf Mobile sofort erfassbar bleibt.
  title: 'Minecraft-Server aktuell offline',

  // Details fuer Spieler ohne Discord. Bei neuen Infos einfach Text und Stand aktualisieren.
  message:
    'Unser Minecraft-Server ist wegen eines technischen Defekts derzeit nicht erreichbar. Wir arbeiten an der Behebung und aktualisieren diese Meldung, sobald es Neuigkeiten gibt.',

  // Optionaler Stand der Meldung. Entfernen, wenn kein Datum angezeigt werden soll.
  updatedAt: '02.07.2026',

  // Optional: Buttons fuer Statusseite, Tutorial, News oder Discord.
  // Leeres Array [] blendet die Buttons aus.
  actions: [
    {
      label: 'Status ansehen',
      href: minecraftGilde.statusUrl,
      external: true,
    },
  ],
};
