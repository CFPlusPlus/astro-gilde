import { LIVE_COPY_DE } from './copy.de';

export type FetchJsonErrorKind = 'timeout' | 'network' | 'invalid' | 'rate_limit';

export interface FetchJsonError {
  kind: FetchJsonErrorKind;
  message: string;
  status?: number;
  retryAfterMs?: number;
}

export type FetchJsonResult<T> =
  | {
      ok: true;
      data: T;
      status: number;
      fetchedAt: number;
    }
  | {
      ok: false;
      error: FetchJsonError;
      status?: number;
      fetchedAt: number;
    };

export interface FetchJsonOptions<T> {
  signal?: AbortSignal;
  timeoutMs?: number;
  cache?: RequestCache;
  headers?: HeadersInit;
  requiredKeys?: string[];
  validate?: (value: unknown) => value is T;
}

const DEFAULT_TIMEOUT_MS = 6_500;

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasRequiredKeys = (value: unknown, requiredKeys: string[]): boolean => {
  if (requiredKeys.length === 0) return true;
  if (!isObjectLike(value)) return false;
  return requiredKeys.every((key) => key in value);
};

const toRetryAfterMs = (headerValue: string | null): number | undefined => {
  if (!headerValue) return undefined;

  const asSeconds = Number(headerValue);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.floor(asSeconds * 1_000);
  }

  const asDate = Date.parse(headerValue);
  if (Number.isNaN(asDate)) return undefined;

  return Math.max(0, asDate - Date.now());
};

const toNetworkMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return LIVE_COPY_DE.error_network;
};

export const fetchJson = async <T>(
  url: string,
  options: FetchJsonOptions<T> = {},
): Promise<FetchJsonResult<T>> => {
  const {
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cache,
    headers,
    requiredKeys = [],
    validate,
  } = options;

  const fetchedAt = Date.now();
  const controller = new AbortController();
  let didTimeout = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const onExternalAbort = (): void => {
    controller.abort(signal?.reason);
  };

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort(new DOMException('Timeout', 'AbortError'));
    }, timeoutMs);
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache,
      headers: {
        Accept: 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return {
          ok: false,
          status: response.status,
          fetchedAt,
          error: {
            kind: 'rate_limit',
            message: LIVE_COPY_DE.rate_limit,
            status: response.status,
            retryAfterMs: toRetryAfterMs(response.headers.get('retry-after')),
          },
        };
      }

      if (response.status >= 400 && response.status < 500) {
        return {
          ok: false,
          status: response.status,
          fetchedAt,
          error: {
            kind: 'invalid',
            message: `Ungueltige Antwort (HTTP ${response.status}).`,
            status: response.status,
          },
        };
      }

      return {
        ok: false,
        status: response.status,
        fetchedAt,
        error: {
          kind: 'network',
          message: `${LIVE_COPY_DE.error_network} (HTTP ${response.status}).`,
          status: response.status,
        },
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        status: response.status,
        fetchedAt,
        error: {
          kind: 'invalid',
          message: 'Antwort war kein gueltiges JSON.',
          status: response.status,
        },
      };
    }

    if (!hasRequiredKeys(payload, requiredKeys)) {
      return {
        ok: false,
        status: response.status,
        fetchedAt,
        error: {
          kind: 'invalid',
          message: `Antwort enthaelt nicht alle erwarteten Keys: ${requiredKeys.join(', ')}.`,
          status: response.status,
        },
      };
    }

    if (validate) {
      let isValid = false;
      try {
        isValid = validate(payload);
      } catch {
        isValid = false;
      }

      if (!isValid) {
        return {
          ok: false,
          status: response.status,
          fetchedAt,
          error: {
            kind: 'invalid',
            message: 'Antwort hat nicht das erwartete Format.',
            status: response.status,
          },
        };
      }
    }

    return {
      ok: true,
      data: payload as T,
      status: response.status,
      fetchedAt,
    };
  } catch (error) {
    if (didTimeout) {
      return {
        ok: false,
        fetchedAt,
        error: {
          kind: 'timeout',
          message: LIVE_COPY_DE.error_timeout,
        },
      };
    }

    return {
      ok: false,
      fetchedAt,
      error: {
        kind: 'network',
        message: toNetworkMessage(error),
      },
    };
  } finally {
    if (timeoutId != null) clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
};
