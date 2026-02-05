// Zentrale Projekt-Konfiguration für minecraft-gilde.de
// -----------------------------------------------------
// Ziel: Strings (URLs, IP, Version) nicht über das Projekt verteilen,
// sondern an einer Stelle pflegen.

export const minecraftGilde = {
  serverIp: 'minecraft-gilde.de',
  mcVersion: '1.21.x',

  // Optional: Link zum GitHub-Repository (wird im Footer angezeigt)
  // Beispiel: 'https://github.com/<user>/<repo>'
  repoUrl: 'https://github.com/CFPlusPlus/minecraft-gilde-web',

  discord: {
    url: 'https://discord.minecraft-gilde.de',
    guildId: '1219625244906754093',
    inviteCode: 'gCNfmWKFSp',
  },

  mapUrl: 'https://map.minecraft-gilde.de',
  statusUrl: 'https://stats.uptimerobot.com/OnyzM9GmG2',

  voting: {
    minecraftServerEuVoteUrl: 'https://minecraft-server.eu/vote/index/2321D',
  },
} as const;

// Wird im Browser via window.__APP_CONFIG__ genutzt (ohne sensitive Daten).
export const browserAppConfig = {
  serverIp: minecraftGilde.serverIp,
  discordGuildId: minecraftGilde.discord.guildId,
  discordInvite: minecraftGilde.discord.url,
  discordInviteCode: minecraftGilde.discord.inviteCode,
  dynmapUrl: minecraftGilde.mapUrl,
  statusUrl: minecraftGilde.statusUrl,
} as const;
