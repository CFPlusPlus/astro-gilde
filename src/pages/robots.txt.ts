import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const baseUrl = site ?? new URL('https://minecraft-gilde.de');
  const sitemapUrl = new URL('/sitemap-index.xml', baseUrl);

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Sitemap',
    `Sitemap: ${sitemapUrl.toString()}`,
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
