export const isExternalHref = (href: string): boolean => {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  );
};

// Internal links should be directory-style (no .html) and use a trailing slash.
// This keeps URLs stable across dev/prod and on static hosts.
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

  // Avoid adding a trailing slash for files with an extension (e.g. /file.json)
  const hasExt = /\/[^/]+\.[^/]+$/.test(path);
  if (!hasExt && path !== '/' && !path.endsWith('/')) path += '/';

  let out = path;
  if (query) out += `?${query}`;
  if (hash) out += `#${hash}`;
  return out;
};
