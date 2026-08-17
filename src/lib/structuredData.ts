import { minecraftGilde } from '../config/minecraftGilde';
import { appRoutes, getRouteLabelByPath } from '../config/routes';

type JsonLd = Record<string, unknown>;

const trimTrailingSlash = (value: string): string => String(value ?? '').replace(/\/$/, '');

const siteUrlFromConfigOrFallback = (fallbackSite: URL): string => {
  const configuredSiteUrl = String(minecraftGilde.brand.siteUrl ?? '').trim();
  return trimTrailingSlash(configuredSiteUrl || fallbackSite.toString());
};

const siteBaseFromSiteUrl = (siteUrl: string): URL => new URL(`${trimTrailingSlash(siteUrl)}/`);

const resolveSiteBase = (fallbackSite: URL): URL =>
  siteBaseFromSiteUrl(siteUrlFromConfigOrFallback(fallbackSite));

const buildMinecraftGildeGameServer = (args: { site: URL; canonicalUrl?: string }): JsonLd => {
  const { site, canonicalUrl } = args;
  const siteUrl = siteUrlFromConfigOrFallback(site);

  return {
    '@type': 'GameServer',
    '@id': `${siteUrl}/#gameserver`,
    name: minecraftGilde.brand.name,
    alternateName: minecraftGilde.brand.alternateName,
    url: siteBaseFromSiteUrl(siteUrl).toString(),
    description: minecraftGilde.server.description,
    game: { '@id': `${siteUrl}/#game` },
    sameAs: [...minecraftGilde.brand.sameAs],
    ...(canonicalUrl ? { mainEntityOfPage: { '@id': `${canonicalUrl}#webpage` } } : null),
  };
};

const buildMinecraftVideoGame = (site: URL): JsonLd => {
  const siteUrl = siteUrlFromConfigOrFallback(site);

  return {
    '@type': 'VideoGame',
    '@id': `${siteUrl}/#game`,
    name: 'Minecraft',
    gameServer: { '@id': `${siteUrl}/#gameserver` },
  };
};

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

const breadcrumbLabelForPath = (pathname: string, fallbackTitle?: string): string => {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  const routeLabel = getRouteLabelByPath(path, 'breadcrumb');
  if (routeLabel) return routeLabel;
  if (path === '/404/') return '404';
  // Erst versuchen: Titel ohne Site-Name verwenden.
  const fromTitle = stripSiteName(fallbackTitle ?? '');
  if (fromTitle) return fromTitle;
  // Letzter Fallback: aus dem Pfad ableiten.
  const seg = path.replace(/^\//, '').replace(/\/$/, '').split('/').filter(Boolean).pop();
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Home';
};

const buildBreadcrumbList = (args: {
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
  const homeUrl = new URL(appRoutes.home, siteBase).toString();
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
  const organizationId = `${siteUrl}/#organization`;
  const gameServerId = `${siteUrl}/#gameserver`;

  const breadcrumb = buildBreadcrumbList({ site, pathname, pageTitle: title });
  const webPageId = `${canonicalUrl}#webpage`;

  // Kern-Graph: Website, Betreiber, Spiel, Server und die konkrete Seite.
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
      publisher: { '@id': organizationId },
    },
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: minecraftGilde.organization.name,
      url: minecraftGilde.organization.url,
    },
    buildMinecraftVideoGame(site),
    buildMinecraftGildeGameServer({ site }),
    {
      '@type': 'WebPage',
      '@id': webPageId,
      url: canonicalUrl,
      name: title,
      description,
      inLanguage: 'de',
      isPartOf: { '@id': websiteId },
      about: { '@id': gameServerId },
      publisher: { '@id': organizationId },
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
    authorName = minecraftGilde.legal.name,
    authorUrl,
    datePublished,
    dateModified,
    articleSection,
  } = args;

  const siteUrl = siteUrlFromConfigOrFallback(site);
  const organizationId = `${siteUrl}/#organization`;

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
    publisher: { '@id': organizationId },
    ...(datePublished ? { datePublished } : null),
    ...(dateModified ? { dateModified } : null),
    mainEntityOfPage: { '@id': `${canonicalUrl}#webpage` },
  };
};

export const buildGameServer = (args: { site: URL; canonicalUrl: string }): JsonLd => {
  const { site, canonicalUrl } = args;

  // Zwei Knoten im Graph: Game + GameServer.
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildMinecraftVideoGame(site),
      buildMinecraftGildeGameServer({ site, canonicalUrl }),
    ],
  };
};
