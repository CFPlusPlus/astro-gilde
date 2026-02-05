import fs from 'node:fs';
import path from 'node:path';

type HomeGallery = {
  urls: string[];
  fallback: string;
  initial: string;
};

// Build-Time: Galerie-Bilder aus /public/images/<ordner> einsammeln
// Hinweis: Auf Linux-Runnern ist das Dateisystem case-sensitive. Daher suchen wir mehrere Varianten.
export const getHomeGallery = (): HomeGallery => {
  // Muss garantiert existieren (sonst sieht man in Safari nur den „broken image“-Platzhalter).
  const fallback = '/images/header-background.webp';

  // WICHTIG: Beim Astro-Build werden Module in `dist/` gebündelt.
  // `import.meta.url` zeigt dann NICHT mehr auf den `src/`-Pfad.
  // Ergebnis: Der Galerie-Scan findet im Build plötzlich keine Bilder -> `[]`.
  // Deshalb nehmen wir einen stabilen Pfad ausgehend vom Projekt-Root.
  const imagesRoot = path.resolve(process.cwd(), 'public', 'images');
  const candidates = ['Galerie', 'galerie', 'Gallery', 'gallery'];

  let foundDirName: string | null = null;
  let foundDirPath: string | null = null;

  for (const name of candidates) {
    const p = path.join(imagesRoot, name);
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        foundDirName = name;
        foundDirPath = p;
        break;
      }
    } catch {
      // Dateisystem-Fehler hier sind unkritisch.
    }
  }

  let files: string[] = [];

  if (foundDirPath) {
    try {
      files = fs
        .readdirSync(foundDirPath)
        .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
        .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
    } catch {
      // Fallback: Bei Fehlern bleibt die Galerie leer.
    }
  }

  // URLs müssen die tatsächliche Ordner-Schreibweise matchen (case-sensitive Server).
  const baseUrl = foundDirName ? `/images/${foundDirName}` : '/images/Galerie';

  const urls = files.map((f) => `${baseUrl}/${encodeURIComponent(f)}`);
  const initial = urls[0] ?? fallback;

  return { urls, fallback, initial };
};
