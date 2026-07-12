import { copyFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const clientDir = path.join(distDir, 'client');
const legacySrc = path.join(clientDir, '404', 'index.html');
const directSrc = path.join(clientDir, '404.html');
const assetsIgnorePath = path.join(clientDir, '.assetsignore');

if (existsSync(legacySrc)) {
  await copyFile(legacySrc, directSrc);
  console.log(`[postbuild-404] Copied ${legacySrc} -> ${directSrc}`);
} else if (!existsSync(directSrc)) {
  console.warn(`[postbuild-404] Skip: ${legacySrc} and ${directSrc} not found`);
}

await writeFile(assetsIgnorePath, '_worker.js\n', 'utf8');
console.log(`[postbuild-404] Wrote ${assetsIgnorePath}`);
