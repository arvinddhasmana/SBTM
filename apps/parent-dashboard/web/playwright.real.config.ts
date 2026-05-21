import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for real-backend smoke tests — no network mocking.
 *
 * Requires the full stack to be running (api-gateway + student-management +
 * postgres). Intended for the test:e2e:real CI step, not the default mock-safe
 * test:e2e step.
 *
 * Run: pnpm --filter web test:e2e:real
 */
export default defineConfig({
  testDir: './e2e/real-backend',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-real', open: 'never' }], ['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    serviceWorkers: 'allow',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
