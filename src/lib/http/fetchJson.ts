export type FetchJsonOptions = {
  signal?: AbortSignal;
  cache?: RequestCache;
  headers?: HeadersInit;
};

export class FetchJsonHttpError extends Error {
  status: number;
  retryAfterMs?: number;

  constructor(status: number, retryAfterMs?: number) {
    super(`HTTP ${status}`);
    this.name = 'FetchJsonHttpError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function toRetryAfterMs(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;

  const asSeconds = Number(headerValue);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.floor(asSeconds * 1_000);
  }

  const asDate = Date.parse(headerValue);
  if (Number.isNaN(asDate)) return undefined;

  return Math.max(0, asDate - Date.now());
}

/**
 * Gemeinsamer JSON-Fetch-Helper fuer Browser-Aufrufe.
 * Wirft bei non-2xx, damit Aufrufer Fehlerbehandlung explizit machen.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { signal, cache, headers } = options;
  const res = await fetch(url, {
    signal,
    cache,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  });

  if (!res.ok) {
    const retryAfterMs =
      res.status === 429 ? toRetryAfterMs(res.headers.get('retry-after')) : undefined;
    throw new FetchJsonHttpError(res.status, retryAfterMs);
  }
  return (await res.json()) as T;
}
