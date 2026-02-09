export type FetchJsonOptions = {
  signal?: AbortSignal;
  cache?: RequestCache;
  headers?: HeadersInit;
};

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

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}
