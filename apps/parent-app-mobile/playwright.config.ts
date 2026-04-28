import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Parent Mobile App (Web)
 *
 * Tests the web version of the React Native app running via Expo web
 */
export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: process.env.CI ? [['html'], ['github']] : [['html'], ['list']],

  // Shared settings for all projects
  use: {
    // Base URL for the app (Expo web default port)
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8081',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports for responsive testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run web',
    url: process.env.E2E_BASE_URL ?? 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Expo to start
  },
});
