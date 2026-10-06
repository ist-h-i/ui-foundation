import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.UI_FIXTURE_PORT ?? 4183);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  use: {
    channel: 'chromium',
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && node scripts/serve.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
