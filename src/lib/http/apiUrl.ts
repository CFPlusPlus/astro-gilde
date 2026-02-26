const API_ORIGIN = 'https://api.minecraft-gilde.de' as const;

export function toApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
}
