export const isExternalHref = (href: string): boolean => {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  );
};

// In Astro dev server, routes are /page (without .html). In production file builds,
// the output files are page.html, so links with .html work on static hosts.
// This helper keeps .html in production, but strips it in dev so navigation works locally.
export const hrefFor = (href: string): string => {
  if (isExternalHref(href)) return href;
  if (import.meta.env.DEV) return href.replace(/\.html(?=[?#]|$)/, '');
  return href;
};
