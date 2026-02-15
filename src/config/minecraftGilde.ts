import { siteUrl } from './site';
import logoImage from '../assets/images/branding/logo.webp';

// Zentrale Projekt-Konfiguration für minecraft-gilde.de
// Ziel: Strings (URLs, IP, Version) nicht über das Projekt verteilen,
// sondern an einer Stelle pflegen.

const externalLinks = {
  discord: 'https://discord.minecraft-gilde.de',
  map: 'https://map.minecraft-gilde.de',
  status: 'https://stats.uptimerobot.com/OnyzM9GmG2',
  voteMinecraftServerEu: 'https://minecraft-server.eu/vote/index/2321D',
  voteMinecraftServerlistNet: 'https://www.minecraft-serverlist.net/vote/59253',
  voteServerlisteNet: 'https://serverliste.net/vote/5142',
} as const;

const communityProfiles = {
  minecraftServerEu:
    'https://minecraft-server.eu/server/index/2321D/Minecraft-Gildede-Vanilla-Survival-und-Freebuild-121x',
  minecraftServerlistNet: 'https://www.minecraft-serverlist.net/server/59253',
  serverlisteNet: 'https://serverliste.net/server/5142',
} as const;

const brandConfig = {
  siteUrl,
  name: 'Minecraft Gilde',
  alternateName: 'Minecraft Gilde - Vanilla SMP (DE)',
  defaultMetaDescription:
    'Minecraft Gilde - Langzeitwelt ohne Resets. Fair ohne Pay-to-Win. Vanilla+ Komfort.',
  websiteDescription:
    'Deutscher Minecraft Vanilla SMP Server (Folia) mit Survival & Freebuild - ohne Resets, ohne Pay2Win, Community-first.',
  logo: {
    path: logoImage.src,
    width: logoImage.width,
    height: logoImage.height,
    alt: 'Minecraft Gilde',
  },
  sameAs: [
    externalLinks.discord,
    externalLinks.map,
    communityProfiles.minecraftServerEu,
    communityProfiles.minecraftServerlistNet,
    communityProfiles.serverlisteNet,
  ],
} as const;

export const minecraftGilde = {
  brand: brandConfig,
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

// Wird im Browser ueber data-* Attribute am <html>-Element genutzt (ohne sensible Daten).
export const browserAppConfig = {
  serverIp: minecraftGilde.serverIp,
  discordGuildId: minecraftGilde.discord.guildId,
  discordInvite: minecraftGilde.discord.url,
  discordInviteCode: minecraftGilde.discord.inviteCode,
  dynmapUrl: minecraftGilde.mapUrl,
  statusUrl: minecraftGilde.statusUrl,
} as const;
