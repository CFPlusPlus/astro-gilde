import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

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
  const source = String(input ?? '');

  // Nackte URLs klickbar machen (ohne Markdown-Link-Ziele "(https://...)" oder bestehende "<https://...>").
  const withAutoLinks = source.replace(/(?<![<(])https?:\/\/[^\s>]+/g, (url) => `<${url}>`);

  const rawHtml = marked.parse(withAutoLinks) as string;
  const clean = DOMPurify.sanitize(rawHtml);

  // target/rel fuer externe Links ergaenzen
  return clean.replace(
    /<a\s+href="(https?:\/\/[^"]+)"(?![^>]*\btarget=)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer"',
  );
}
