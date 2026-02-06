/* eslint-disable @typescript-eslint/no-unused-vars */
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GIT_COMMIT_HASH?: string;
  readonly GIT_BRANCH?: string;
  readonly GIT_REPO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface BrowserAppConfig {
    readonly serverIp?: string;
    readonly discordGuildId?: string;
    readonly discordInvite?: string;
    readonly discordInviteCode?: string;
    readonly dynmapUrl?: string;
    readonly statusUrl?: string;
  }

  interface Window {
    __APP_CONFIG__?: BrowserAppConfig;
  }
}

export {};
