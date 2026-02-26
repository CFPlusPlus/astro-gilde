import { minecraftGilde } from '../../config/minecraftGilde';

export function toApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const withoutApiPrefix = normalizedPath.startsWith('/api/')
    ? normalizedPath.slice('/api'.length)
    : normalizedPath;
  return `${minecraftGilde.apiOrigin}${withoutApiPrefix}`;
}
