import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true, // damit \n als <br> gerendert wird, \n\n bleibt ein <p>
});

/**
 * Rendert eine kleine, sichere Markdown-Teilmenge zu bereinigtem HTML.
 * - Unterstuetzt Links wie [Text](/pfad) und Inline-Code via `...`
 * - Setzt target=_blank fuer externe http(s)-Links
 */
export function renderMarkdown(input: string): string {
  const source = String(input ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Nackte URLs klickbar machen (ohne Markdown-Link-Ziele "(https://...)" oder bestehende "<https://...>").
  const withAutoLinks = source.replace(
    /(^|[^<(])(https?:\/\/[^\s>]+)/g,
    (_match, prefix: string, url: string) => `${prefix}<${url}>`,
  );

  const rawHtml = marked.parse(withAutoLinks) as string;
  const safeLinksHtml = rawHtml.replace(
    /<a\s+href="([^"]+)"/g,
    (_match, href: string) => `<a href="${/^(https?:|\/|#)/i.test(href) ? href : '#'}"`,
  );

  // target/rel fuer externe Links ergaenzen
  return safeLinksHtml.replace(
    /<a\s+href="(https?:\/\/[^"]+)"(?![^>]*\btarget=)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer"',
  );
}
