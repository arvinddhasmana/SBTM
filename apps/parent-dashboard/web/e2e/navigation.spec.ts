/**
 * E2E: Navigation & Route Guards — Parent Dashboard Web
 *
 * Covers sidebar/nav links, mobile menu, and protected route enforcement.
 *
 * Test IDs: WPD-NAV01–WPD-NAV10
 */
import { test, expect, MOCK_CHILDREN, mockApiRoutes, injectSession } from './fixtures';

test.describe('Navigation – Parent Dashboard Web', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page, { children: MOCK_CHILDREN });
    await page.goto('/login');
    await injectSession(page);
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');
    await page.waitForTimeout(500);
  });

  test('WPD-NAV01: nav bar is visible on protected pages', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-NAV02: clicking Absence nav link navigates to /absence', async ({ page }) => {
    // Desktop nav has "absence" link text
    const absenceLink = page.locator('a[href="/absence"]').first();
    await expect(absenceLink).toBeVisible({ timeout: 10_000 });
    await absenceLink.click();
    await page.waitForURL('**/absence');
    expect(page.url()).toContain('absence');
  });

  test('WPD-NAV03: clicking Notifications bell navigates to /notifications', async ({ page }) => {
    const notifLink = page.locator('a[href="/notifications"]').first();
    await expect(notifLink).toBeVisible({ timeout: 10_000 });
    await notifLink.click();
    await page.waitForURL('**/notifications');
    expect(page.url()).toContain('notifications');
  });

  test('WPD-NAV04: clicking Settings link navigates to /settings', async ({ page }) => {
    const settingsLink = page.locator('a[href="/settings"]').first();
    await expect(settingsLink).toBeVisible({ timeout: 10_000 });
    await settingsLink.click();
    await page.waitForURL('**/settings');
    expect(page.url()).toContain('settings');
  });

  test('WPD-NAV05: clicking SBTM logo link navigates to /dashboard', async ({ page }) => {
    // Go to absence first
    await page.goto('/absence');
    await page.waitForURL('**/absence');
    const logoLink = page.locator('a[href="/dashboard"]').first();
    await expect(logoLink).toBeVisible({ timeout: 10_000 });
    await logoLink.click();
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('dashboard');
  });

  test('WPD-NAV06: unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10_000 });
    expect(page.url()).toContain('login');
  });

  test('WPD-NAV07: unauthenticated access to /absence redirects to /login', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/absence');
    await page.waitForURL('**/login', { timeout: 10_000 });
    expect(page.url()).toContain('login');
  });

  test('WPD-NAV08: unauthenticated access to /notifications redirects to /login', async ({
    page,
  }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/notifications');
    await page.waitForURL('**/login', { timeout: 10_000 });
    expect(page.url()).toContain('login');
  });

  test('WPD-NAV09: mobile menu button is present on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForTimeout(500);
    // Hamburger / menu button (sm:hidden)
    const menuBtn = page
      .locator('button')
      .filter({ hasText: /open menu/i })
      .or(page.locator('button[class*="sm:hidden"]'))
      .or(page.locator('nav button').last());
    await expect(menuBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-NAV10: / root redirects authenticated users to /dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    expect(page.url()).toContain('dashboard');
  });
});
