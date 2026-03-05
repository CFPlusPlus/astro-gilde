export function parseRetryAfterMs(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;

  const asSeconds = Number(headerValue);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.floor(asSeconds * 1_000);
  }

  const asDate = Date.parse(headerValue);
  if (Number.isNaN(asDate)) return undefined;

  return Math.max(0, asDate - Date.now());
}
