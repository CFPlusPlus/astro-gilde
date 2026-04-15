import headerBackgroundImage from '../../assets/images/home/header-background.webp';
import type { ImageMetadata } from 'astro';

type HomeGallery = {
  urls: string[];
  fallback: string;
  initial: string;
  initialImage: ImageMetadata;
};

type ImageMetadataModule = {
  default: ImageMetadata;
};

type ImageUrlModule = {
  default: string;
};

const galleryImageMetadataModules = import.meta.glob<ImageMetadataModule>(
  '../../assets/images/home/gallery/*.{png,jpg,jpeg,webp,avif}',
  { eager: true },
);

const galleryImageUrlModules = import.meta.glob<ImageUrlModule>(
  '../../assets/images/home/gallery/*.{png,jpg,jpeg,webp,avif}',
  {
    eager: true,
    query: '?url',
  },
);

const fileNameFromGlobPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? '';
};

const sortByGalleryFileName = <T>(a: [string, T], b: [string, T]): number =>
  fileNameFromGlobPath(a[0]).localeCompare(fileNameFromGlobPath(b[0]), 'de', {
    numeric: true,
  });

const toSortedGalleryImages = (): ImageMetadata[] =>
  Object.entries(galleryImageMetadataModules)
    .sort(sortByGalleryFileName)
    .map((entry) => entry[1].default);

const toSortedGalleryUrls = (): string[] =>
  Object.entries(galleryImageUrlModules)
    .sort(sortByGalleryFileName)
    .map((entry) => entry[1].default);

const toUniqueImageUrls = (images: ImageMetadata[]): string[] => {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const image of images) {
    if (seen.has(image.src)) continue;
    seen.add(image.src);
    urls.push(image.src);
  }

  return urls;
};

const toUniqueUrls = (urls: string[]): string[] => {
  const seen = new Set<string>();
  const uniqueUrls: string[] = [];

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    uniqueUrls.push(url);
  }

  return uniqueUrls;
};

const toSortedFallbackUrls = (): string[] =>
  toUniqueImageUrls(
    Object.entries(galleryImageMetadataModules)
      .sort((a, b) =>
        fileNameFromGlobPath(a[0]).localeCompare(fileNameFromGlobPath(b[0]), 'de', {
          numeric: true,
        }),
      )
      .map((entry) => entry[1].default),
  );

// Build-Time: Galerie-Bilder aus src/assets/images/home/gallery einsammeln.
export const getHomeGallery = (): HomeGallery => {
  const fallbackImage = headerBackgroundImage;
  const images = toSortedGalleryImages();
  const initialImage = images[0] ?? fallbackImage;
  const urls = toUniqueUrls(toSortedGalleryUrls());
  const safeUrls = urls.length > 0 ? urls : toSortedFallbackUrls();
  const initial = initialImage.src;
  const fallback = fallbackImage.src;

  return { urls: safeUrls, fallback, initial, initialImage };
};
