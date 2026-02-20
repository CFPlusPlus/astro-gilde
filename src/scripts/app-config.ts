const pickString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readConfigFromDataset = (): BrowserAppConfig => {
  const root = document.documentElement;
  return {
    serverIp: pickString(root.dataset.serverIp),
    mcVersion: pickString(root.dataset.mcVersion),
    discordGuildId: pickString(root.dataset.discordGuildId),
    discordInvite: pickString(root.dataset.discordInvite),
    discordInviteCode: pickString(root.dataset.discordInviteCode),
    dynmapUrl: pickString(root.dataset.dynmapUrl),
    statusUrl: pickString(root.dataset.statusUrl),
  };
};

export const readBrowserAppConfig = (fallback: BrowserAppConfig): BrowserAppConfig => {
  const fromDataset = readConfigFromDataset();
  const fromLegacy = window.__APP_CONFIG__ ?? {};

  return {
    ...fallback,
    ...fromLegacy,
    ...fromDataset,
  };
};
