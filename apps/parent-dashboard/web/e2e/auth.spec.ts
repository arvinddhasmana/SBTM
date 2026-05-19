/**
 * E2E: Authentication — Parent Dashboard Web
 *
 * Covers login form rendering, form validation, successful login,
 * session persistence, and logout.
 *
 * Test IDs: WPD-AUTH01–WPD-AUTH10
 */
import { test, expect } from '@playwright/test';
import {
  loginViaForm,
  injectSession,
  mockApiRoutes,
  collectConsoleErrors,
  TEST_USERS,
} from './fixtures';

test.describe('Authentication – Parent Dashboard Web', () => {
  test.describe('Login Page', () => {
    test('WPD-AUTH01: renders email input, password input, and submit button', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/login');
      await expect(page.locator('input[id="email"]')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('input[id="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('WPD-AUTH02: shows app branding on login page', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/login');
      await page.waitForSelector('input[id="email"]', { timeout: 15_000 });
      const h2 = page.locator('h2');
      await expect(h2).toBeVisible();
    });

    test('WPD-AUTH03: unauthenticated root redirect goes to /login', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/');
      await page.waitForURL('**/login', { timeout: 10_000 });
      await expect(page.locator('input[id="email"]')).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('WPD-AUTH04: empty submit does not navigate away from login', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/login');
      await page.waitForSelector('button[type="submit"]', { timeout: 15_000 });
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('input[id="email"]')).toBeVisible();
      // Still on login (required validation prevents navigation)
      expect(page.url()).toContain('login');
    });

    test('WPD-AUTH05: bad credentials shows error message', async ({ page }) => {
      await mockApiRoutes(page, { loginSuccess: false });
      await page.goto('/login');
      await page.waitForSelector('input[id="email"]', { timeout: 15_000 });
      await page.locator('input[id="email"]').fill('bad@test.com');
      await page.locator('input[id="password"]').fill('wrongpass');
      await page.locator('button[type="submit"]').click();
      // Error div with red background appears
      await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Successful Login', () => {
    test('WPD-AUTH06: successful login navigates to /dashboard', async ({ page }) => {
      await mockApiRoutes(page);
      await loginViaForm(page);
      expect(page.url()).toContain('dashboard');
    });

    test('WPD-AUTH07: successful login stores auth_token in localStorage', async ({ page }) => {
      await mockApiRoutes(page);
      await loginViaForm(page);
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeTruthy();
    });

    test('WPD-AUTH08: successful login stores parent_user in localStorage', async ({ page }) => {
      await mockApiRoutes(page);
      await loginViaForm(page);
      const stored = await page.evaluate(() => localStorage.getItem('parent_user'));
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.email).toBe(TEST_USERS.PARENT.email);
    });
  });

  test.describe('Session Persistence', () => {
    test('WPD-AUTH09: injected session bypasses login and reaches /dashboard', async ({ page }) => {
      await mockApiRoutes(page);
      await page.goto('/login');
      await injectSession(page);
      await page.goto('/dashboard');
      await page.waitForURL('**/dashboard', { timeout: 10_000 });
      expect(page.url()).toContain('dashboard');
    });
  });

  test.describe('Logout', () => {
    test('WPD-AUTH10: logout button redirects to /login', async ({ page }) => {
      await mockApiRoutes(page);
      await loginViaForm(page);
      // Click the logout button (LogOut icon in nav)
      await page.locator('nav button[title]').last().click();
      await page.waitForURL('**/login', { timeout: 10_000 });
      await expect(page.locator('input[id="email"]')).toBeVisible();
    });
  });

  test('no critical console errors on login page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await mockApiRoutes(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle').catch(() => {});
    const critical = errors.filter(
      (e) => !e.includes('Failed to fetch') && !e.includes('net::ERR') && !e.includes('AbortError'),
    );
    expect(critical).toHaveLength(0);
  });
});
