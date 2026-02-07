import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown', () => {
  it('renders headings and lists', () => {
    const html = renderMarkdown('# Titel\n\n- Eins\n- Zwei');

    expect(html).toContain('<h1>Titel</h1>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Eins</li>');
    expect(html).toContain('<li>Zwei</li>');
  });

  it('keeps internal markdown links without target blank', () => {
    const html = renderMarkdown('[FAQ](/faq)');

    expect(html).toContain('<a href="/faq">FAQ</a>');
    expect(html).not.toContain('target="_blank"');
  });

  it('adds target and rel to external markdown links', () => {
    const html = renderMarkdown('[Discord](https://discord.minecraft-gilde.de)');

    expect(html).toContain(
      '<a href="https://discord.minecraft-gilde.de" target="_blank" rel="noopener noreferrer">Discord</a>',
    );
  });

  it('auto-links naked URLs but not markdown link targets', () => {
    const html = renderMarkdown('Docs: https://example.com und [Mehr](https://example.org).');

    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">',
    );
    expect(html).toContain(
      '<a href="https://example.org" target="_blank" rel="noopener noreferrer">Mehr</a>',
    );
  });
});
