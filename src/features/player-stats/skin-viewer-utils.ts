export function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export function loadImageProbe(url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const img = new Image();
    let done = false;

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      signal.removeEventListener('abort', onAbort);
    };

    const finishResolve = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };

    const finishReject = (error: Error) => {
      if (done) return;
      done = true;
      cleanup();
      reject(error);
    };

    const onAbort = () => {
      finishReject(new DOMException('Aborted', 'AbortError'));
    };

    signal.addEventListener('abort', onAbort, { once: true });
    img.onload = finishResolve;
    img.onerror = () => finishReject(new Error(`Image load failed: ${url}`));
    img.src = url;
  });
}
