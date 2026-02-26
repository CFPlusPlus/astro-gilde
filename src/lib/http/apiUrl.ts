const API_ORIGIN = 'https://api.minecraft-gilde.de' as const;

export function toApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const withoutApiPrefix = normalizedPath.startsWith('/api/')
    ? normalizedPath.slice('/api'.length)
    : normalizedPath;
  return `${API_ORIGIN}${withoutApiPrefix}`;
}
