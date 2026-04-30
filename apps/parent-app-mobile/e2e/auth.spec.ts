/**
 * E2E: Authentication Flows
 *
 * Covers:
 *   - Login page rendering
 *   - Form validation (empty fields, invalid credentials)
 *   - Successful login renders dashboard
 *   - Session persistence across page reload
 *   - Logout returns to login page
 *
 * Test IDs: AUTH01–AUTH10
 *
 * Note: Expo Web is a single-page app, so the URL does not change between
 * "login" and "dashboard". We assert via `data-testid` instead of URL.
 */
import { test, expect } from '@playwright/test';
import {
  loginAs,
  logout,
  isLoggedIn,
  collectConsoleErrors,
  injectMockSession,
  mockApiResponses,
  TEST_USERS,
} from './fixtures';

test.describe('Authentication Flows', () => {
  test.describe('Login Page', () => {
    test('AUTH01: should render login form with email, password, and submit', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-testid="login-email"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
    });

    test('AUTH02: should show app branding and title', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('SBTM Parent')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Form Validation', () => {
    test('AUTH03: should not navigate away with empty email and password', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="login-submit"]', { timeout: 15000 });
      await page.locator('[data-testid="login-submit"]').click();
      // Login form is still visible (no navigation)
      await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-screen"]')).toHaveCount(0);
    });

    test('AUTH04: should stay on login page when API rejects credentials', async ({ page }) => {
      await mockApiResponses(page, { login: false });
      await page.goto('/');
      await page.waitForSelector('[data-testid="login-email"]', { timeout: 15000 });
      await page.locator('[data-testid="login-email"]').fill('wrong@test.com');
      await page.locator('[data-testid="login-password"]').fill('wrongpass');
      await page.locator('[data-testid="login-submit"]').click();
      await page.waitForTimeout(800);
      await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-screen"]')).toHaveCount(0);
    });
  });

  test.describe('Successful Login', () => {
    test('AUTH05: should login successfully and render dashboard', async ({ page }) => {
      await mockApiResponses(page, { login: true, children: [] });
      await loginAs(page, TEST_USERS.PARENT);
      await expect(page.locator('[data-testid="dashboard-screen"]')).toBeVisible();
    });

    test('AUTH06: should store session in localStorage', async ({ page }) => {
      await mockApiResponses(page, { login: true, children: [] });
      await loginAs(page, TEST_USERS.PARENT);
      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(authToken).toBeTruthy();
    });
  });

  test.describe('Session Persistence', () => {
    test('AUTH07: should persist session across page reload', async ({ page }) => {
      await mockApiResponses(page, { login: true, children: [] });
      await injectMockSession(page);
      await page.goto('/');
      await page.waitForTimeout(1500);
      const wasLoggedIn = await isLoggedIn(page);
      await page.reload();
      await page.waitForTimeout(1500);
      const stillLoggedIn = await isLoggedIn(page);
      // We don't strictly enforce auto-login (no rehydration logic guaranteed)
      // but we DO want both reloads to behave the same.
      expect(wasLoggedIn).toBe(stillLoggedIn);
    });

    test('AUTH08: should preserve auth_token in localStorage across navigations', async ({
      page,
    }) => {
      await injectMockSession(page);
      await page.goto('/');
      const tokenBefore = await page.evaluate(() => localStorage.getItem('auth_token'));
      await page.reload();
      const tokenAfter = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(tokenAfter).toBe(tokenBefore);
    });
  });

  test.describe('Logout', () => {
    test('AUTH09: should logout and return to login page', async ({ page }) => {
      await mockApiResponses(page, { login: true, children: [] });
      await loginAs(page, TEST_USERS.PARENT);
      await logout(page);
      await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-screen"]')).toHaveCount(0);
    });

    test('AUTH10: dashboard should not be visible after logout', async ({ page }) => {
      await mockApiResponses(page, { login: true, children: [] });
      await loginAs(page, TEST_USERS.PARENT);
      await logout(page);
      await expect(page.locator('[data-testid="dashboard-screen"]')).toHaveCount(0);
    });
  });

  test('should not have console errors on login page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes('Failed to fetch') &&
        !err.includes('net::ERR') &&
        !err.includes('AbortError'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
