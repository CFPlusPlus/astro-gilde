export const WELCOME_DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const WELCOME_DISMISS_KEY = 'mg_stats_welcome_dismissed_at';
export const WELCOME_DISMISS_LEGACY_KEY = 'mg_stats_welcome_closed';

export function shouldShowWelcome(storage: Storage, now = Date.now()) {
  const rawDismissedAt = storage.getItem(WELCOME_DISMISS_KEY);
  if (rawDismissedAt) {
    const dismissedAt = Number(rawDismissedAt);
    if (Number.isFinite(dismissedAt) && now - dismissedAt < WELCOME_DISMISS_TTL_MS) {
      return false;
    }
    storage.removeItem(WELCOME_DISMISS_KEY);
  }

  if (storage.getItem(WELCOME_DISMISS_LEGACY_KEY) === '1') {
    storage.removeItem(WELCOME_DISMISS_LEGACY_KEY);
  }

  return true;
}
