/**
 * E2E: Authentication — Driver App (Expo Web)
 *
 * Covers login form rendering, validation, session injection, and logout.
 *
 * Test IDs: DA-AUTH01–DA-AUTH08
 */
import {
  test,
  expect,
  mockApiRoutes,
  injectDriverSession,
  collectConsoleErrors,
  TEST_DRIVER,
} from './fixtures';

test.describe('Authentication – Driver App', () => {
  test.describe('Login Screen', () => {
    test('DA-AUTH01: renders login screen with email, password and submit', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/');
      await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
    });

    test('DA-AUTH02: shows app title on login screen', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/');
      await page.waitForSelector('[data-testid="login-screen"]', { timeout: 20_000 });
      const title = page.locator('text=/SBTM|School Bus/i');
      await expect(title.first()).toBeVisible();
    });

    test('DA-AUTH03: no critical console errors on login screen', async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await mockApiRoutes(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      const critical = errors.filter(
        (e) =>
          !e.includes('Failed to fetch') &&
          !e.includes('net::ERR') &&
          !e.includes('AbortError') &&
          !e.includes('fontFamily') &&
          !e.includes('expo-linear-gradient'),
      );
      expect(critical).toHaveLength(0);
    });
  });

  test.describe('Session Injection', () => {
    test('DA-AUTH04: injected session shows route select screen', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/');
      await injectDriverSession(page);
      await page.reload();
      await expect(page.locator('[data-testid="route-select-screen"]')).toBeVisible({
        timeout: 20_000,
      });
    });

    test('DA-AUTH05: route select screen shows driver name', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/');
      await injectDriverSession(page);
      await page.reload();
      await expect(page.locator(`text=${TEST_DRIVER.name}`)).toBeVisible({ timeout: 15_000 });
    });

    test('DA-AUTH06: logout button is visible on route select screen', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/');
      await injectDriverSession(page);
      await page.reload();
      await expect(page.locator('[data-testid="logout-button"]')).toBeVisible({ timeout: 15_000 });
    });

    test('DA-AUTH07: clicking logout returns to login screen', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/');
      await injectDriverSession(page);
      await page.reload();
      await page.waitForSelector('[data-testid="logout-button"]', { timeout: 15_000 });
      await page.locator('[data-testid="logout-button"]').click();
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 10_000 });
    });

    test('DA-AUTH08: localStorage cleared after logout', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/');
      await injectDriverSession(page);
      await page.reload();
      await page.waitForSelector('[data-testid="logout-button"]', { timeout: 15_000 });
      await page.locator('[data-testid="logout-button"]').click();
      await page.waitForTimeout(1000);
      const stored = await page.evaluate(() => localStorage.getItem('driver-storage'));
      const state = stored ? JSON.parse(stored) : null;
      const isAuth = state?.state?.isAuthenticated ?? false;
      expect(isAuth).toBe(false);
    });
  });
});
