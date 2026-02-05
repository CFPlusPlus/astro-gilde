// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import { execSync } from 'node:child_process';

// https://astro.build/config

// Build-Metadaten (Git Commit/Branch) für Footer & Debugging.
// Hinweis: Wird beim Build ermittelt (statisch) und ändert sich erst beim nächsten Deploy.
/** @param {string} cmd */
const safeGit = (cmd) => {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
};

const COMMIT_HASH =
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.COMMIT_REF ||
  safeGit('git rev-parse HEAD') ||
  'dev';

const BRANCH_NAME =
  process.env.GITHUB_REF_NAME ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.CF_PAGES_BRANCH ||
  safeGit('git rev-parse --abbrev-ref HEAD') ||
  '';

const REPO_URL = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : '';

const tailwindPlugin = /** @type {any} */ (tailwindcss());

export default defineConfig({
  site: 'https://minecraft-gilde.de',
  // Directory-style output (no .html in URLs)
  build: { format: 'directory' },
  trailingSlash: 'always',
  integrations: [
    react(),
    sitemap({
      // Nicht ins Sitemap aufnehmen (SEO): /404/
      filter: (page) => !page.endsWith('/404/'),
    }),
  ],
  vite: {
    define: {
      'import.meta.env.GIT_COMMIT_HASH': JSON.stringify(COMMIT_HASH),
      'import.meta.env.GIT_BRANCH': JSON.stringify(BRANCH_NAME),
      'import.meta.env.GIT_REPO_URL': JSON.stringify(REPO_URL),
    },
    plugins: [tailwindPlugin],
  },
});
