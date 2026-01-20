import { copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const src = path.join(distDir, '404', 'index.html');
const dest = path.join(distDir, '404.html');

if (!existsSync(src)) {
  console.warn(`[postbuild-404] Skip: ${src} not found (did astro build run?)`);
  process.exit(0);
}

await copyFile(src, dest);
console.log(`[postbuild-404] Copied ${src} -> ${dest}`);
