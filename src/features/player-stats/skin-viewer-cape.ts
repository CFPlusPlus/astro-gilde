import { toApiUrl } from '../../lib/http/apiUrl';

export const CAPE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
export const CAPE_EMPTY_CACHE_TTL_MS = 1000 * 60 * 30;

type MojangProfile = {
  properties?: Array<{ name?: string; value?: string }>;
};

type MinetoolsProfile = {
  decoded?: {
    textures?: {
      CAPE?: { url?: string };
    };
  };
  raw?: MojangProfile;
};

type CapeCacheEntry = {
  capeUrl: string | null;
  expiresAt: number;
};

type CapeApiResponse = {
  capeUrl?: string | null;
  cape?: string | { url?: string | null } | null;
  url?: string | null;
  hasCape?: boolean;
};

const CAPE_CACHE_KEY_PREFIX = 'mg:skin-viewer:cape:';

function decodeCapeFromProfile(profile: MojangProfile): string | null {
  const texturesProp = profile.properties?.find(
    (entry) => entry?.name === 'textures' && typeof entry.value === 'string',
  );
  if (!texturesProp?.value) return null;

  try {
    const decoded = atob(texturesProp.value);
    const parsed = JSON.parse(decoded) as {
      textures?: {
        CAPE?: { url?: string };
      };
    };
    const capeUrl = parsed?.textures?.CAPE?.url;
    return typeof capeUrl === 'string' && capeUrl ? capeUrl : null;
  } catch {
    return null;
  }
}

function capeCacheKey(uuidCompact: string): string {
  return `${CAPE_CACHE_KEY_PREFIX}${uuidCompact}`;
}

export function readCapeCache(uuidCompact: string): string | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(capeCacheKey(uuidCompact));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CapeCacheEntry;
    if (!parsed || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(capeCacheKey(uuidCompact));
      return undefined;
    }
    return typeof parsed.capeUrl === 'string' && parsed.capeUrl ? parsed.capeUrl : null;
  } catch {
    return undefined;
  }
}

export function writeCapeCache(uuidCompact: string, capeUrl: string | null, ttlMs: number): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CapeCacheEntry = {
      capeUrl,
      expiresAt: Date.now() + ttlMs,
    };
    window.localStorage.setItem(capeCacheKey(uuidCompact), JSON.stringify(payload));
  } catch {
    // Unkritisch: Cache kann in Private-Mode/Storage-Limits fehlschlagen.
  }
}

export async function fetchCapeFromMojangProfile(
  uuidCompact: string,
  signal: AbortSignal,
): Promise<string | null> {
  const res = await fetch(`https://api.minetools.eu/profile/${encodeURIComponent(uuidCompact)}`, {
    signal,
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 204 || res.status === 404) return null;
    throw new Error(`HTTP ${res.status}`);
  }

  const data = (await res.json()) as MinetoolsProfile;

  const decodedCape = data?.decoded?.textures?.CAPE?.url;
  if (typeof decodedCape === 'string' && decodedCape) return decodedCape;

  if (data?.raw) return decodeCapeFromProfile(data.raw);
  return null;
}

function parseCapeApiResponse(data: CapeApiResponse): string | null | undefined {
  if (!data || typeof data !== 'object') return undefined;

  if ('capeUrl' in data) {
    if (typeof data.capeUrl === 'string' && data.capeUrl) return data.capeUrl;
    if (data.capeUrl === null) return null;
  }

  if ('cape' in data) {
    if (typeof data.cape === 'string' && data.cape) return data.cape;
    if (data.cape && typeof data.cape === 'object') {
      const nested = data.cape.url;
      if (typeof nested === 'string' && nested) return nested;
      if (nested === null) return null;
    }
    if (data.cape === null) return null;
  }

  if ('url' in data) {
    if (typeof data.url === 'string' && data.url) return data.url;
    if (data.url === null) return null;
  }

  if (data.hasCape === false) return null;
  return undefined;
}

export async function fetchCapeFromServerCache(
  uuidCompact: string,
  signal: AbortSignal,
): Promise<string | null | undefined> {
  try {
    const res = await fetch(toApiUrl(`/api/cape?uuid=${encodeURIComponent(uuidCompact)}`), {
      signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.status === 404 || res.status === 405 || res.status === 501) {
      return undefined;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = (await res.json()) as CapeApiResponse;
    return parseCapeApiResponse(payload);
  } catch (e) {
    if (signal.aborted) return undefined;
    console.warn('Server-Cape-Cache nicht verfuegbar, fallback aktiv:', e);
    return undefined;
  }
}
