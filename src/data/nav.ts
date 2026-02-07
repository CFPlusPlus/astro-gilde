import { minecraftGilde } from '../config/minecraftGilde';
import { appRoutes, getRouteLabel, type AppRouteKey } from '../config/routes';

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

const navLinkForRoute = (route: AppRouteKey): NavLink => ({
  href: appRoutes[route],
  label: getRouteLabel(route, 'nav'),
});

const navMenuItemForRoute = (route: AppRouteKey, icon: NavMenuIcon): NavMenuItem => ({
  ...navLinkForRoute(route),
  icon,
});

export const NAV_PRIMARY_LINKS: NavLink[] = [
  navLinkForRoute('home'),
  navLinkForRoute('tutorial'),
  navLinkForRoute('rules'),
  navLinkForRoute('stats'),
  navLinkForRoute('vote'),
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
      navMenuItemForRoute('home', 'home'),
      navMenuItemForRoute('tutorial', 'tutorial'),
      navMenuItemForRoute('rules', 'rules'),
      navMenuItemForRoute('stats', 'stats'),
      navMenuItemForRoute('vote', 'vote'),
      navMenuItemForRoute('team', 'team'),
    ],
  },
  {
    title: 'Server',
    items: [
      navMenuItemForRoute('serverInfo', 'server'),
      navMenuItemForRoute('commands', 'commands'),
      navMenuItemForRoute('faq', 'faq'),
      navMenuItemForRoute('history', 'history'),
      { href: minecraftGilde.statusUrl, label: 'Status', external: true, icon: 'status' },
      { href: minecraftGilde.mapUrl, label: 'Dynmap', external: true, icon: 'map' },
    ],
  },
  {
    title: 'Mehr aus der Gilde',
    items: [
      navMenuItemForRoute('partner', 'partner'),
      navMenuItemForRoute('privacy', 'privacy'),
      navMenuItemForRoute('imprint', 'imprint'),
    ],
  },
];
