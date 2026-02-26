import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, '..');

const astroConfigPath = path.join(rootDir, 'astro.config.mjs');
const siteConfigPath = path.join(rootDir, 'src', 'config', 'site.ts');

const astroSitePattern = /\bsite\s*:\s*(["'`])([^"'`]+)\1/;
const siteUrlPattern = /export\s+const\s+siteUrl\s*=\s*(["'`])([^"'`]+)\1/;

const normalizeUrlForCompare = (value, label, filePath) => {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Ungueltige URL fuer ${label} in ${filePath}: "${value}"`);
  }

  url.hash = '';
  url.search = '';

  let pathname = url.pathname;
  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  if (pathname === '/') {
    pathname = '';
  }

  return `${url.protocol}//${url.host}${pathname}`;
};

const extractValue = (content, pattern, label, filePath) => {
  const match = content.match(pattern);
  if (!match || !match[2]) {
    throw new Error(`Konnte ${label} in ${filePath} nicht auslesen.`);
  }
  return match[2].trim();
};

const main = async () => {
  const [astroConfig, siteConfig] = await Promise.all([
    readFile(astroConfigPath, 'utf8'),
    readFile(siteConfigPath, 'utf8'),
  ]);

  const astroSiteRaw = extractValue(astroConfig, astroSitePattern, '`site`', astroConfigPath);
  const siteUrlRaw = extractValue(siteConfig, siteUrlPattern, '`siteUrl`', siteConfigPath);

  const astroSiteNormalized = normalizeUrlForCompare(astroSiteRaw, '`site`', astroConfigPath);
  const siteUrlNormalized = normalizeUrlForCompare(siteUrlRaw, '`siteUrl`', siteConfigPath);

  if (astroSiteNormalized !== siteUrlNormalized) {
    console.error('[config:check] Konfigurations-Drift erkannt.');
    console.error(`[config:check] astro.config.mjs (site): ${astroSiteRaw}`);
    console.error(`[config:check] src/config/site.ts (siteUrl): ${siteUrlRaw}`);
    console.error('[config:check] Bitte beide Werte auf dieselbe URL setzen.');
    process.exitCode = 1;
    return;
  }

  console.log(`[config:check] OK: ${astroSiteRaw}`);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[config:check] Fehler: ${message}`);
  process.exitCode = 1;
});
