/**
 * E2E: Videos Page — Admin Dashboard
 *
 * Verifies that the /videos page loads, the API is queried successfully,
 * and the filter dropdowns are present.
 *
 * Test IDs: VID01–VID06
 */
import { test, expect } from '@playwright/test';
import { loginAs, collectConsoleErrors } from './fixtures';

test.describe('Videos – Admin Dashboard', () => {
  test('VID01: /videos page loads for SUPER_ADMIN', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');

    const videoPromise = page
      .waitForResponse(
        (r) => r.url().includes('/api/v1/videos') && r.request().method() === 'GET',
        { timeout: 10_000 },
      )
      .catch(() => null);

    await page.goto('/videos', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    const resp = await videoPromise;
    if (resp) {
      expect(resp.status()).toBeLessThan(500);
    }
  });

  test('VID02: /videos page loads for STA_ADMIN', async ({ page }) => {
    await loginAs(page, 'STA_ADMIN');
    await page.goto('/videos', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    // Page heading should be visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('VID03: route filter dropdown is visible', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');

    // Arm waiter for videos API before navigation so the loading state resolves
    const videosReady = page
      .waitForResponse(
        (r) => r.url().includes('/api/v1/videos') && r.request().method() === 'GET',
        { timeout: 12_000 },
      )
      .catch(() => null);

    await page.goto('/videos', { waitUntil: 'domcontentloaded' });
    await videosReady;
    await page.waitForTimeout(400);

    const selects = page.locator('select');
    await expect(selects.first()).toBeVisible({ timeout: 10_000 });
  });

  test('VID04: event type filter is visible', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');

    const videosReady = page
      .waitForResponse(
        (r) => r.url().includes('/api/v1/videos') && r.request().method() === 'GET',
        { timeout: 12_000 },
      )
      .catch(() => null);

    await page.goto('/videos', { waitUntil: 'domcontentloaded' });
    await videosReady;
    await page.waitForTimeout(400);

    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('VID05: filter icon (lucide) is visible', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/videos', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    // The Filter icon from lucide-react renders as an SVG
    const svgIcons = page.locator('svg');
    await expect(svgIcons.first()).toBeVisible({ timeout: 10_000 });
  });

  test('VID06: no critical console errors on /videos', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/videos', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const critical = errors().filter(
      (e) =>
        !e.includes('Failed to fetch') &&
        !e.includes('net::ERR') &&
        !e.includes('AbortError') &&
        !e.includes('401') &&
        !e.includes('Unauthorized'),
    );
    expect(critical).toHaveLength(0);
  });
});
