import { minecraftGilde } from '../config/minecraftGilde';

export type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

export const FOOTER_LINKS: FooterLink[] = [
  { href: '/datenschutz/', label: 'Datenschutz' },
  { href: '/impressum/', label: 'Impressum' },
  { href: '/team/', label: 'Team' },
  { href: minecraftGilde.discord.url, label: 'Discord', external: true },
  { href: minecraftGilde.mapUrl, label: 'Dynmap', external: true },
];

export const FOOTER_COPY = {
  owner: 'Christian Falkner',
  brand: 'Minecraft Gilde',
  disclaimer: 'Wir sind weder mit Mojang AB noch mit Microsoft verbunden.',
} as const;
