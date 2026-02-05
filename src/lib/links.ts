export const isExternalHref = (href: string): boolean => {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  );
};

// Interne Links sollen den Verzeichnis-Stil nutzen (keine .html) und mit Slash enden.
// Das haelt URLs stabil in Dev/Prod und auf statischen Hosts.
export const hrefFor = (href: string): string => {
  if (isExternalHref(href)) return href;

  const hashIndex = href.indexOf('#');
  const hash = hashIndex >= 0 ? href.slice(hashIndex + 1) : null;
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;

  const queryIndex = withoutHash.indexOf('?');
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : null;
  const pathPart = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  let path = (pathPart || '/').replace(/\.html$/i, '');
  if (!path.startsWith('/')) path = `/${path}`;

  // Kein Slash fuer Dateien mit Dateiendung (z. B. /file.json)
  const hasExt = /\/[^/]+\.[^/]+$/.test(path);
  if (!hasExt && path !== '/' && !path.endsWith('/')) path += '/';

  let out = path;
  if (query) out += `?${query}`;
  if (hash) out += `#${hash}`;
  return out;
};
