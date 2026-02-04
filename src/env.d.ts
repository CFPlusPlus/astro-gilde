// Zusätzliche Build-Variablen (via Vite define in astro.config.mjs)
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GIT_COMMIT_HASH?: string;
  readonly GIT_BRANCH?: string;
  readonly GIT_REPO_URL?: string;
}
