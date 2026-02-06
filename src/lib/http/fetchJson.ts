export type FetchJsonOptions = {
  signal?: AbortSignal;
  cache?: RequestCache;
  headers?: HeadersInit;
};

/**
 * Shared JSON fetch helper for browser calls.
 * Throws on non-2xx to keep call-sites explicit about failure handling.
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
