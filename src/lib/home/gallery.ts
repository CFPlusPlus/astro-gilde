import headerBackgroundImage from '../../assets/images/home/header-background.webp';
import type { ImageMetadata } from 'astro';

type HomeGallery = {
  urls: string[];
  fallback: string;
  initial: string;
};

type ImageUrlModule = {
  default: ImageMetadata;
};

const galleryImageModules = import.meta.glob<ImageUrlModule>(
  '../../assets/images/home/gallery/*.{png,jpg,jpeg,webp,avif}',
  { eager: true },
);

const fileNameFromGlobPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? '';
};

const toSortedGalleryUrls = (): string[] =>
  Object.entries(galleryImageModules)
    .sort((a, b) =>
      fileNameFromGlobPath(a[0]).localeCompare(fileNameFromGlobPath(b[0]), 'de', {
        numeric: true,
      }),
    )
    .map((entry) => entry[1].default.src);

// Build-Time: Galerie-Bilder aus src/assets/images/home/gallery einsammeln.
export const getHomeGallery = (): HomeGallery => {
  const fallback = headerBackgroundImage.src;
  const urls = toSortedGalleryUrls();
  const initial = urls[0] ?? fallback;

  return { urls, fallback, initial };
};
