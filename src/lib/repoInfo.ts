const DEV_COMMIT_HASH = 'dev';
const DEFAULT_REPO_LABEL = 'GitHub';

type RepoInfoOptions = {
  configRepoUrl?: string;
  envRepoUrl?: string;
  commitHash?: string;
};

export type RepoInfo = {
  repoUrl: string;
  repoLabel: string;
  commitHash: string;
  shortCommit: string;
  showCommit: boolean;
  commitHref: string;
};

const resolveRepoLabel = (repoUrl: string): string => {
  if (!repoUrl) return DEFAULT_REPO_LABEL;

  try {
    const url = new URL(repoUrl);
    const cleanedPath = url.pathname.replace(/^\/+|\/+$/g, '');
    const parts = cleanedPath.split('/').filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  } catch {
    // Ignore URL parsing errors and fall back to default label.
  }

  return DEFAULT_REPO_LABEL;
};

export const getRepoInfo = ({
  configRepoUrl = '',
  envRepoUrl = '',
  commitHash = '',
}: RepoInfoOptions): RepoInfo => {
  const repoUrl = configRepoUrl || envRepoUrl || '';
  const showCommit = Boolean(commitHash && commitHash !== DEV_COMMIT_HASH);
  const shortCommit = showCommit ? commitHash.slice(0, 7) : '';
  const commitHref = repoUrl && showCommit ? `${repoUrl}/commit/${commitHash}` : '';

  return {
    repoUrl,
    repoLabel: resolveRepoLabel(repoUrl),
    commitHash,
    shortCommit,
    showCommit,
    commitHref,
  };
};
