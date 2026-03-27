import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);
const webServerCommand = isCi
  ? 'npm run build && node scripts/e2e-static-server.mjs'
  : 'npm run dev -- --host 127.0.0.1 --port 4321';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: isCi ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: webServerCommand,
    env: {
      ...process.env,
      // E2E-Mocks erwarten dieselbe API-Basis in allen Umgebungen.
      PUBLIC_API_ORIGIN: '/api',
      // Fuer lokale E2E-Tests reicht eine Platzhalter-URL, damit der
      // Cloudflare-Adapter den Hyperdrive-Check beim Dev-Server-Start besteht.
      CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:
        process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??
        'postgres://postgres:postgres@127.0.0.1:5432/hyperdrive_e2e',
    },
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !isCi,
    timeout: isCi ? 240_000 : 120_000,
  },
});
