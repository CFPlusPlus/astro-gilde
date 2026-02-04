import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

type HomeGallery = {
  urls: string[];
  fallback: string;
  initial: string;
};

// Build-Time: Galerie-Bilder aus /public/images/Galerie einsammeln
export const getHomeGallery = (): HomeGallery => {
  const fallback = '/images/survival.webp';
  const galleryDir = fileURLToPath(new URL('../../../public/images/Galerie', import.meta.url));

  let images: string[] = [];

  try {
    images = fs
      .readdirSync(galleryDir)
      .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  } catch {
    // Wenn der Ordner nicht existiert, nutzen wir unten das Fallback-Bild.
  }

  const urls = images.map((f) => `/images/Galerie/${encodeURIComponent(f)}`);
  const initial = urls[0] ?? fallback;

  return { urls, fallback, initial };
};
