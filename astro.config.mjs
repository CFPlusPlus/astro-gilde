// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://minecraft-gilde.de',
  // Directory-style output (no .html in URLs)
  build: { format: 'directory' },
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Nicht ins Sitemap aufnehmen (SEO): /404/
      filter: (page) => !page.endsWith('/404/'),
    }),
  ],
  vite: {
    // Hinweis: Astro bringt eine eigene Vite-Version mit.
    // @tailwindcss/vite referenziert Vite-Typen aus dem Root, was bei Type-Checks zu Plugin-Typ-Konflikten führt.
    // Zur Laufzeit ist das unkritisch – deshalb hier bewusst ignoriert.
    // @ts-expect-error - Astro/Vite Typen kollidieren (Runtime ok)
    plugins: [tailwindcss()],
  },
});
