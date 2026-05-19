import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for Parent Dashboard (web).
 *
 * Mocks all API calls — no real backend required.
 * The dev server reads VITE_API_URL from the existing .env file
 * (VITE_API_URL=http://localhost:3001). All requests to that origin
 * are intercepted by Playwright route handlers in each spec.
 *
 * Run tests:        pnpm --filter web test:e2e
 * Run with browser: pnpm --filter web test:e2e:headed
 * Interactive UI:   pnpm --filter web test:e2e:ui
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev --port 5174',
    url: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
