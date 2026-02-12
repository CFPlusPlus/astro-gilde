import { copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const legacySrc = path.join(distDir, '404', 'index.html');
const directSrc = path.join(distDir, '404.html');
const dest = directSrc;

if (existsSync(legacySrc)) {
  await copyFile(legacySrc, dest);
  console.log(`[postbuild-404] Copied ${legacySrc} -> ${dest}`);
  process.exit(0);
}

if (existsSync(directSrc)) {
  process.exit(0);
}

console.warn(`[postbuild-404] Skip: ${legacySrc} and ${directSrc} not found`);
