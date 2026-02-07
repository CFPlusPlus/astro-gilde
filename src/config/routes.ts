type AppRouteMeta = {
  path: `/${string}`;
  navLabel: string;
  breadcrumbLabel?: string;
};

const appRouteMeta = {
  home: { path: '/', navLabel: 'Start', breadcrumbLabel: 'Home' },
  tutorial: { path: '/tutorial/', navLabel: 'Tutorial' },
  rules: { path: '/regeln/', navLabel: 'Regeln' },
  commands: { path: '/befehle/', navLabel: 'Befehle' },
  vote: { path: '/voten/', navLabel: 'Voten' },
  serverInfo: { path: '/serverinfos/', navLabel: 'Serverinfo', breadcrumbLabel: 'Serverinfos' },
  stats: { path: '/statistiken/', navLabel: 'Statistiken' },
  faq: { path: '/faq/', navLabel: 'FAQ' },
  history: { path: '/geschichte/', navLabel: 'Geschichte' },
  team: { path: '/team/', navLabel: 'Team' },
  partner: { path: '/partner/', navLabel: 'Partner' },
  privacy: { path: '/datenschutz/', navLabel: 'Datenschutz' },
  imprint: { path: '/impressum/', navLabel: 'Impressum' },
} as const satisfies Record<string, AppRouteMeta>;

export type AppRouteKey = keyof typeof appRouteMeta;
export type RouteLabelVariant = 'nav' | 'breadcrumb';

export const appRoutes = Object.fromEntries(
  Object.entries(appRouteMeta).map(([key, meta]) => [key, meta.path]),
) as {
  [K in AppRouteKey]: (typeof appRouteMeta)[K]['path'];
};

const normalizeRoutePath = (pathname: string): string => {
  const path = String(pathname ?? '').trim();
  if (!path || path === '/') return '/';

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const routeEntries = Object.entries(appRouteMeta) as Array<
  [AppRouteKey, (typeof appRouteMeta)[AppRouteKey]]
>;

const routeKeyByPath = new Map<string, AppRouteKey>(
  routeEntries.map(([key, meta]) => [normalizeRoutePath(meta.path), key]),
);

export const getRoute = (key: AppRouteKey): string => appRoutes[key];

export const getRouteLabel = (key: AppRouteKey, variant: RouteLabelVariant = 'nav'): string => {
  const meta = appRouteMeta[key];
  const breadcrumbLabel = 'breadcrumbLabel' in meta ? meta.breadcrumbLabel : undefined;
  return variant === 'breadcrumb' ? (breadcrumbLabel ?? meta.navLabel) : meta.navLabel;
};

export const getRouteKeyByPath = (pathname: string): AppRouteKey | undefined =>
  routeKeyByPath.get(normalizeRoutePath(pathname));

export const getRouteLabelByPath = (
  pathname: string,
  variant: RouteLabelVariant = 'breadcrumb',
): string | undefined => {
  const key = getRouteKeyByPath(pathname);
  return key ? getRouteLabel(key, variant) : undefined;
};
