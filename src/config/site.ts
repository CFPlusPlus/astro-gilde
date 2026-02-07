export const siteUrl = 'https://minecraft-gilde.de' as const;
export const canonicalTrailingSlash = 'always' as const;

const site = new URL(siteUrl);
site.protocol = 'https:';
site.pathname = '/';
site.search = '';
site.hash = '';

export { site };

const normalizePathname = (value: string): string => {
  let pathname = value.trim();

  if (!pathname) return '/';

  try {
    pathname = new URL(pathname).pathname;
  } catch {
    // Relative path input is expected and handled below.
  }

  pathname = pathname.replace(/\\/g, '/').replace(/\/{2,}/g, '/');

  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }

  if (canonicalTrailingSlash === 'always') {
    if (pathname !== '/' && !pathname.endsWith('/')) {
      pathname = `${pathname}/`;
    }
  } else if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  return pathname;
};

export const canonicalFor = (pathname: string): string => {
  const normalizedPathname = normalizePathname(pathname);
  return new URL(normalizedPathname, site).toString();
};
