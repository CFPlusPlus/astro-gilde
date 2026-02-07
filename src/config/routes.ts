export const appRoutes = {
  home: '/',
  tutorial: '/tutorial/',
  rules: '/regeln/',
  commands: '/befehle/',
  vote: '/voten/',
  serverInfo: '/serverinfos/',
  stats: '/statistiken/',
  faq: '/faq/',
  team: '/team/',
  partner: '/partner/',
  privacy: '/datenschutz/',
  imprint: '/impressum/',
} as const;

export type AppRouteKey = keyof typeof appRoutes;

export const getRoute = (key: AppRouteKey): string => appRoutes[key];
