import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for Admin Dashboard.
 *
 * Expects the admin dashboard to be running at E2E_BASE_URL (default: http://localhost:5173).
 * Start the full Docker stack before running: `docker compose up -d`
 *
 * Run tests:         pnpm --filter admin-dashboard test:e2e
 * Run with browser:  pnpm --filter admin-dashboard test:e2e:headed
 * Interactive UI:    pnpm --filter admin-dashboard test:e2e:ui
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sequential — share one running server
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    // Use 'domcontentloaded' as the default wait condition.
    // React Router v7 performs client-side redirects before 'load' fires,
    // which causes ERR_ABORTED if we wait for 'load'. DOMContentLoaded
    // ensures the page has parsed its HTML and React can bootstrap.
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
