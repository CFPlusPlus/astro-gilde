import { minecraftGilde } from '../config/minecraftGilde';

type JsonLd = Record<string, unknown>;

const trimTrailingSlash = (value: string): string => String(value ?? '').replace(/\/$/, '');

const siteUrlFromConfigOrFallback = (fallbackSite: URL): string => {
  const configuredSiteUrl = String(minecraftGilde.brand.siteUrl ?? '').trim();
  return trimTrailingSlash(configuredSiteUrl || fallbackSite.toString());
};

const siteBaseFromSiteUrl = (siteUrl: string): URL => new URL(`${trimTrailingSlash(siteUrl)}/`);

const resolveSiteBase = (fallbackSite: URL): URL =>
  siteBaseFromSiteUrl(siteUrlFromConfigOrFallback(fallbackSite));

const absoluteUrlFromConfigSite = (pathOrUrl: string, fallbackSite: URL): string =>
  new URL(pathOrUrl, resolveSiteBase(fallbackSite)).toString();

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripSiteName = (title: string): string => {
  const t = String(title || '').trim();
  if (!t) return '';

  const brandName = escapeRegex(minecraftGilde.brand.name);
  return t
    .replace(new RegExp(`^${brandName}\\s*[\\u2013\\u2014-]\\s*`, 'i'), '')
    .replace(new RegExp(`\\s*[\\u2013\\u2014-]\\s*${brandName}$`, 'i'), '')
    .trim();
};

export const breadcrumbLabelForPath = (pathname: string, fallbackTitle?: string): string => {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  // Bekannte statische Routen -> feste Labels (kein Rate-Guessing).
  const map: Record<string, string> = {
    '/': 'Home',
    '/befehle/': 'Befehle',
    '/datenschutz/': 'Datenschutz',
    '/faq/': 'FAQ',
    '/geschichte/': 'Geschichte',
    '/impressum/': 'Impressum',
    '/partner/': 'Partner',
    '/regeln/': 'Regeln',
    '/serverinfos/': 'Serverinfos',
    '/statistiken/': 'Statistiken',
    '/team/': 'Team',
    '/tutorial/': 'Tutorial',
    '/voten/': 'Voten',
    '/404/': '404',
  };

  if (map[path]) return map[path];
  // Erst versuchen: Titel ohne Site-Name verwenden.
  const fromTitle = stripSiteName(fallbackTitle ?? '');
  if (fromTitle) return fromTitle;
  // Letzter Fallback: aus dem Pfad ableiten.
  const seg = path.replace(/^\//, '').replace(/\/$/, '').split('/').filter(Boolean).pop();
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Home';
};

export const buildBreadcrumbList = (args: {
  site: URL;
  pathname: string;
  pageTitle?: string;
}): JsonLd | null => {
  const { site, pathname, pageTitle } = args;
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  // Keine Breadcrumbs auf Home/404 (waere nur redundant).
  if (path === '/' || path === '/404/') return null;

  const siteBase = resolveSiteBase(site);
  const label = breadcrumbLabelForPath(path, pageTitle);
  const homeUrl = new URL('/', siteBase).toString();
  const pageUrl = new URL(path, siteBase).toString();

  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: homeUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: label,
        item: pageUrl,
      },
    ],
  };
};

export const buildBaseGraph = (args: {
  site: URL;
  canonicalUrl: string;
  pathname: string;
  title: string;
  description: string;
  ogImage?: string;
}): JsonLd => {
  const { site, canonicalUrl, pathname, title, description, ogImage } = args;
  const siteUrl = siteUrlFromConfigOrFallback(site);
  const siteBase = siteBaseFromSiteUrl(siteUrl);

  // Stabile IDs, damit Knoten im Graph sauber referenziert werden koennen.
  const websiteId = `${siteUrl}/#website`;
  const orgId = `${siteUrl}/#org`;

  const breadcrumb = buildBreadcrumbList({ site, pathname, pageTitle: title });
  const webPageId = `${canonicalUrl}#webpage`;
  const logoUrl = absoluteUrlFromConfigSite(minecraftGilde.brand.logo.path, site);

  // Kern-Graph: Website, Organisation und die konkrete Seite.
  const graph: JsonLd[] = [
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: siteBase.toString(),
      name: minecraftGilde.brand.name,
      alternateName: minecraftGilde.brand.alternateName,
      description: minecraftGilde.brand.websiteDescription,
      inLanguage: 'de',
      isAccessibleForFree: true,
      publisher: { '@id': orgId },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteBase.toString()}?s={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': orgId,
      name: minecraftGilde.brand.name,
      url: siteBase.toString(),
      logo: {
        '@type': 'ImageObject',
        url: logoUrl,
        width: minecraftGilde.brand.logo.width,
        height: minecraftGilde.brand.logo.height,
      },
      sameAs: [...minecraftGilde.brand.sameAs],
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'Community / Support',
          url: minecraftGilde.discord.url,
          availableLanguage: ['de'],
        },
      ],
    },
    {
      '@type': 'WebPage',
      '@id': webPageId,
      url: canonicalUrl,
      name: title,
      description,
      inLanguage: 'de',
      isPartOf: { '@id': websiteId },
      about: { '@id': orgId },
      publisher: { '@id': orgId },
      ...(ogImage
        ? {
            primaryImageOfPage: {
              '@type': 'ImageObject',
              url: ogImage,
            },
          }
        : null),
    },
  ];

  // Breadcrumbs nur anhaengen, wenn sie sinnvoll sind.
  if (breadcrumb) {
    graph.push(breadcrumb);
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
};

export const buildFaqPage = (args: {
  canonicalUrl: string;
  site: URL;
  items: Array<{ q: string; a: string }>;
}): JsonLd => {
  const { canonicalUrl, site, items } = args;
  const siteBase = resolveSiteBase(site);

  const absolutizeInternal = (text: string) => {
    const src = String(text ?? '');

    const toAbs = (href: string) => {
      // Relative Links fuer JSON-LD absolut machen.
      const h = String(href ?? '').trim();
      return h.startsWith('/') ? new URL(h, siteBase).toString() : h;
    };

    // Markdown-Links in Klartext wandeln (und relative URLs absolut setzen).
    const withMdLinks = src.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
      const url = toAbs(href);
      return `${String(label).trim()}: ${url}`;
    });

    return (
      withMdLinks
        // Inline-Code -> Klartext.
        .replace(/`([^`]+)`/g, '$1')
        // Antworten fuer JSON-LD kompakt halten.
        .replace(/\n\n/g, '\n')
        .replace(/\s+\n/g, '\n')
        // Uebrige interne Pfade wie "/tutorial" absolut setzen.
        .replace(/(\s|^)(\/[a-z0-9/-]+\/?)(?=\s|$)/gi, (_m, p1, p2) => {
          const abs = new URL(p2, siteBase).toString();
          return `${p1}${abs}`;
        })
    );
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${canonicalUrl}#faq`,
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: String(it.q).trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: absolutizeInternal(String(it.a).trim()),
      },
    })),
  };
};

export const buildHowTo = (args: {
  canonicalUrl: string;
  name: string;
  description: string;
  steps: Array<{ name: string; text: string; url?: string }>;
}): JsonLd => {
  const { canonicalUrl, name, description, steps } = args;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${canonicalUrl}#howto`,
    name,
    description,
    // Reihenfolge beibehalten und Position explizit setzen.
    step: steps.map((s, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url } : null),
    })),
  };
};

export const buildArticle = (args: {
  site: URL;
  canonicalUrl: string;
  type?: 'Article' | 'TechArticle';
  headline: string;
  description: string;
  image?: string;
  authorName?: string;
  authorUrl?: string;
  datePublished?: string;
  dateModified?: string;
  articleSection?: string;
}): JsonLd => {
  const {
    site,
    canonicalUrl,
    type = 'Article',
    headline,
    description,
    image,
    authorName = 'Christian Falkner',
    authorUrl,
    datePublished,
    dateModified,
    articleSection,
  } = args;

  const siteUrl = siteUrlFromConfigOrFallback(site);
  const orgId = `${siteUrl}/#org`;

  // Optionalfelder nur setzen, wenn vorhanden, um JSON-LD schlank zu halten.
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${canonicalUrl}#article`,
    headline,
    description,
    inLanguage: 'de',
    ...(articleSection ? { articleSection } : null),
    ...(image ? { image } : null),
    author: {
      '@type': 'Person',
      name: authorName,
      ...(authorUrl ? { url: authorUrl } : null),
    },
    publisher: { '@id': orgId },
    ...(datePublished ? { datePublished } : null),
    ...(dateModified ? { dateModified } : null),
    mainEntityOfPage: { '@id': `${canonicalUrl}#webpage` },
  };
};

export const buildGameServer = (args: {
  site: URL;
  canonicalUrl: string;
  ip: string;
  port?: number;
  version: string;
  name?: string;
  maxPlayers?: number;
}): JsonLd => {
  const {
    site,
    canonicalUrl,
    ip,
    port = 25565,
    version,
    name = minecraftGilde.brand.alternateName,
    maxPlayers,
  } = args;
  const siteUrl = siteUrlFromConfigOrFallback(site);
  const siteBase = siteBaseFromSiteUrl(siteUrl);
  const orgId = `${siteUrl}/#org`;
  const gameId = `${siteUrl}/#game`;
  const serverId = `${siteUrl}/#gameserver`;
  const logoUrl = absoluteUrlFromConfigSite(minecraftGilde.brand.logo.path, site);

  // Zwei Knoten im Graph: Game + GameServer.
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'VideoGame',
        '@id': gameId,
        name: 'Minecraft',
        genre: ['Sandbox', 'Multiplayer', 'Survival'],
        gamePlatform: ['PC', 'macOS', 'Linux'],
        inLanguage: 'de',
        image: logoUrl,
        keywords:
          'Minecraft, Vanilla SMP, Survival, Freebuild, Folia, deutsch, Community, ohne Reset, ohne Pay2Win',
        gameServer: { '@id': serverId },
      },
      {
        '@type': 'GameServer',
        '@id': serverId,
        name,
        url: siteBase.toString(),
        game: { '@id': gameId },
        availableLanguage: ['de'],
        serverLocation: {
          '@type': 'Place',
          address: { '@type': 'PostalAddress', addressCountry: 'DE' },
        },
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'IP/Host', value: ip },
          { '@type': 'PropertyValue', name: 'Port', value: String(port) },
          { '@type': 'PropertyValue', name: 'Version', value: version },
          { '@type': 'PropertyValue', name: 'Modus', value: 'Vanilla SMP / Survival / Freebuild' },
          { '@type': 'PropertyValue', name: 'Whitelist', value: 'nein' },
          ...(typeof maxPlayers === 'number'
            ? [{ '@type': 'PropertyValue', name: 'Max. Spieler', value: String(maxPlayers) }]
            : []),
        ],
        provider: { '@id': orgId },
        mainEntityOfPage: { '@id': `${canonicalUrl}#webpage` },
      },
    ],
  };
};
