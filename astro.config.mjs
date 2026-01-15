// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://minecraft-gilde.de',
  trailingSlash: 'never',
  build: { format: 'file' },
});
