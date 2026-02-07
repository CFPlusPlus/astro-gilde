import { minecraftGilde } from '../config/minecraftGilde';

export type NavLink = {
  href: string;
  label: string;
  external?: boolean;
};

export type NavMenuIcon =
  | 'home'
  | 'tutorial'
  | 'rules'
  | 'stats'
  | 'vote'
  | 'team'
  | 'server'
  | 'commands'
  | 'faq'
  | 'history'
  | 'status'
  | 'map'
  | 'partner'
  | 'privacy'
  | 'imprint';

export type NavMenuItem = NavLink & {
  icon: NavMenuIcon;
};

export type NavMenuSection = {
  title: string;
  items: NavMenuItem[];
};

export const NAV_PRIMARY_LINKS: NavLink[] = [
  { href: '/', label: 'Start' },
  { href: '/tutorial/', label: 'Tutorial' },
  { href: '/regeln/', label: 'Regeln' },
  { href: '/statistiken/', label: 'Statistiken' },
  { href: '/voten/', label: 'Voten' },
];

export const NAV_DISCORD_LINK: NavLink = {
  href: minecraftGilde.discord.url,
  label: 'Discord',
  external: true,
};

export const NAV_MEGA_MENU_SECTIONS: NavMenuSection[] = [
  {
    title: 'Hauptmen\u00fc',
    items: [
      { href: '/', label: 'Start', icon: 'home' },
      { href: '/tutorial/', label: 'Tutorial', icon: 'tutorial' },
      { href: '/regeln/', label: 'Regeln', icon: 'rules' },
      { href: '/statistiken/', label: 'Statistiken', icon: 'stats' },
      { href: '/voten/', label: 'Voten', icon: 'vote' },
      { href: '/team/', label: 'Team', icon: 'team' },
    ],
  },
  {
    title: 'Server',
    items: [
      { href: '/serverinfos/', label: 'Serverinfo', icon: 'server' },
      { href: '/befehle/', label: 'Befehle', icon: 'commands' },
      { href: '/faq/', label: 'FAQ', icon: 'faq' },
      { href: '/geschichte/', label: 'Geschichte', icon: 'history' },
      { href: minecraftGilde.statusUrl, label: 'Status', external: true, icon: 'status' },
      { href: minecraftGilde.mapUrl, label: 'Dynmap', external: true, icon: 'map' },
    ],
  },
  {
    title: 'Mehr aus der Gilde',
    items: [
      { href: '/partner/', label: 'Partner', icon: 'partner' },
      { href: '/datenschutz/', label: 'Datenschutz', icon: 'privacy' },
      { href: '/impressum/', label: 'Impressum', icon: 'imprint' },
    ],
  },
];
