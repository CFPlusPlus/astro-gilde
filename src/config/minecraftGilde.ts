// Zentrale Projekt-Konfiguration fuer minecraft-gilde.de
// -----------------------------------------------------
// Ziel: Strings (URLs, IP, Version) nicht ueber das Projekt verteilen,
// sondern an einer Stelle pflegen.

export const externalLinks = {
  discord: 'https://discord.minecraft-gilde.de',
  map: 'https://map.minecraft-gilde.de',
  status: 'https://stats.uptimerobot.com/OnyzM9GmG2',
  voteMinecraftServerEu: 'https://minecraft-server.eu/vote/index/2321D',
  voteMinecraftServerlistNet: 'https://www.minecraft-serverlist.net/vote/59253',
  voteServerlisteNet: 'https://serverliste.net/vote/5142',
} as const;

export type ExternalLinkKey = keyof typeof externalLinks;

export const getExternalLink = (key: ExternalLinkKey): string => externalLinks[key];

export const minecraftGilde = {
  serverIp: 'minecraft-gilde.de',
  mcVersion: '1.21.x',

  // Optional: Link zum GitHub-Repository (wird im Footer angezeigt)
  // Beispiel: 'https://github.com/<user>/<repo>'
  repoUrl: 'https://github.com/CFPlusPlus/minecraft-gilde-web',

  discord: {
    url: externalLinks.discord,
    guildId: '1219625244906754093',
    inviteCode: 'gCNfmWKFSp',
  },

  mapUrl: externalLinks.map,
  statusUrl: externalLinks.status,

  voting: {
    minecraftServerEuVoteUrl: externalLinks.voteMinecraftServerEu,
    minecraftServerlistNetVoteUrl: externalLinks.voteMinecraftServerlistNet,
    serverlisteNetVoteUrl: externalLinks.voteServerlisteNet,
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
