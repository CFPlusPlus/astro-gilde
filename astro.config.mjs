// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://minecraft-gilde.de',
  // Directory-style output (no .html in URLs)
  build: { format: 'directory' },
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
