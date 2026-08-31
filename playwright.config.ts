import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * The suite runs against the seeded in-memory store, so it needs no database
 * and no secrets — `npm run e2e` works on a fresh clone. Playwright boots the
 * dev server itself and reuses an already-running one locally.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  timeout: 45_000,

  use: {
    baseURL: 'http://127.0.0.1:3210',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    command: 'npm run dev -- --port 3210',
    url: 'http://127.0.0.1:3210',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // A clean seed each run keeps the assertions deterministic.
    env: { VITPULSE_DATA_DIR: '.vitpulse-e2e' },
  },
});
