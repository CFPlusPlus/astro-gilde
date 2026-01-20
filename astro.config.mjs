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
    plugins: [tailwindcss()],
  },
});
