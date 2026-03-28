import { minecraftGilde } from '../../config/minecraftGilde';

export function toApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const withoutApiPrefix = normalizedPath.startsWith('/api/')
    ? normalizedPath.slice('/api'.length)
    : normalizedPath;
  const url = `${minecraftGilde.apiOrigin}${withoutApiPrefix}`;

  // Nur bei lokalem /api-Proxy einen Trailing Slash erzwingen.
  if (!minecraftGilde.apiOrigin.startsWith('/')) return url;

  const match = url.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  if (!match) return url;

  const pathname = match[1] ?? url;
  const search = match[2] ?? '';
  const hash = match[3] ?? '';
  if (pathname.endsWith('/')) return url;

  return `${pathname}/${search}${hash}`;
}
