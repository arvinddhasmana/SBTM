/**
 * E2E: Settings Page — Admin Dashboard
 *
 * Verifies that /settings renders for all roles, shows user profile info,
 * and exposes navigation links to sub-sections.
 *
 * Test IDs: ST01–ST08
 */
import { test, expect } from '@playwright/test';
import { loginAs, collectConsoleErrors, TEST_USERS, type TestRole } from './fixtures';

test.describe('Settings – Admin Dashboard', () => {
  const roles: TestRole[] = ['SUPER_ADMIN', 'STA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN'];

  for (const role of roles) {
    test(`ST01-${role}: /settings page loads for ${role}`, async ({ page }) => {
      await loginAs(page, role);
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    });
  }

  test('ST02: shows user name in profile section', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    // The Settings page renders the authenticated user's name
    const nameText = page.getByText(TEST_USERS['SUPER_ADMIN'].name);
    await expect(nameText).toBeVisible({ timeout: 10_000 });
  });

  test('ST03: shows user email in profile section', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const emailText = page.getByText(TEST_USERS['SUPER_ADMIN'].email);
    await expect(emailText).toBeVisible({ timeout: 10_000 });
  });

  test('ST04: shows role badge in profile section', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    // Role badge shows role name (with spaces instead of underscores)
    await expect(page.locator('text=/SUPER ADMIN/i')).toBeVisible({ timeout: 10_000 });
  });

  test('ST05: GPS Source Settings link is visible for SUPER_ADMIN', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const gpsLink = page.locator('a[href="/settings/gps-source"]');
    await expect(gpsLink).toBeVisible({ timeout: 10_000 });
  });

  test('ST06: page contains navigation cards', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    // Settings uses Card components — at least one should render
    const cards = page.locator('[class*="card"], [class*="Card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('ST07: /settings/gps-source page loads for SUPER_ADMIN', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/settings/gps-source', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('ST08: no critical console errors on /settings', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
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
