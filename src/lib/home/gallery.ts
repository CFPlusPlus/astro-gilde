import headerBackgroundImage from '../../assets/images/home/header-background.webp';
import type { ImageMetadata } from 'astro';

type HomeGallery = {
  urls: string[];
  fallback: string;
  initial: string;
  initialImage: ImageMetadata;
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

const toSortedGalleryImages = (): ImageMetadata[] =>
  Object.entries(galleryImageModules)
    .sort((a, b) =>
      fileNameFromGlobPath(a[0]).localeCompare(fileNameFromGlobPath(b[0]), 'de', {
        numeric: true,
      }),
    )
    .map((entry) => entry[1].default);

// Build-Time: Galerie-Bilder aus src/assets/images/home/gallery einsammeln.
export const getHomeGallery = (): HomeGallery => {
  const fallbackImage = headerBackgroundImage;
  const images = toSortedGalleryImages();
  const initialImage = images[0] ?? fallbackImage;
  const urls = images.map((image) => image.src);
  const initial = initialImage.src;
  const fallback = fallbackImage.src;

  return { urls, fallback, initial, initialImage };
};
