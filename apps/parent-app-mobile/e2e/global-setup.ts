/**
 * Global setup: warms up the Expo Metro bundle before tests run.
 * On cold start, Metro compiles the JS bundle on first request (30-60s).
 * Without pre-warming, the first test would time out waiting for elements.
 */
import { chromium } from '@playwright/test';

export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(baseURL, { timeout: 90_000, waitUntil: 'load' });
    // Wait for React to render (login form or dashboard)
    await page
      .waitForSelector('[data-testid="login-email"], [data-testid="dashboard-screen"]', {
        timeout: 60_000,
      })
      .catch(() => {
        /* ignore — bundle is warm even if testid not found */
      });
  } finally {
    await browser.close();
  }
}
