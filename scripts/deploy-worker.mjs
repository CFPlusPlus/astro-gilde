import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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

  if (command === 'npm' && args[0] === 'run' && args[1] === 'build') {
    const wranglerConfig = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
    const hasHyperdriveBinding = Array.isArray(wranglerConfig.hyperdrive)
      ? wranglerConfig.hyperdrive.some(
          (binding) => binding && typeof binding === 'object' && binding.binding === 'HYPERDRIVE',
        )
      : false;

    if (!hasHyperdriveBinding) {
      console.error(
        'Hyperdrive-Binding HYPERDRIVE fehlt in dist/server/wrangler.json. Deploy abgebrochen.',
      );
      process.exit(1);
    }
  }
}
