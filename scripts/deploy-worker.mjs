import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  CLOUDFLARE_ENV: 'production',
};

const commands = [
  ['npm', ['run', 'build']],
  ['wrangler', ['deploy']],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
