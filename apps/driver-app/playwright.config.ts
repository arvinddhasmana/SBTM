import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for Driver App (Expo Web).
 *
 * Tests the web version of the React Native driver app served via Expo.
 * All API calls are mocked — no real backend required.
 *
 * Run tests:        pnpm --filter driver-app test:e2e
 * Run with browser: pnpm --filter driver-app test:e2e:headed
 * Interactive UI:   pnpm --filter driver-app test:e2e:ui
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8082',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'EXPO_WEB_PORT=8082 pnpm run web',
    url: process.env.E2E_BASE_URL ?? 'http://localhost:8082',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
