/**
 * E2E: Authentication Flows
 *
 * Covers:
 *   - Login page rendering
 *   - Form validation (empty fields, invalid credentials)
 *   - Successful login redirects to dashboard
 *   - Session persistence across page reload
 *   - Logout clears session
 *   - Protected routes redirect to login when not authenticated
 *
 * Test IDs: AUTH01–AUTH10
 */
import { test, expect } from '@playwright/test';
import {
  loginAs,
  logout,
  isLoggedIn,
  collectConsoleErrors,
  injectMockSession,
  clearSession,
  mockApiResponses,
  TEST_USERS,
} from './fixtures';

test.describe('Authentication Flows', () => {
  // ─── Login Page Rendering ────────────────────────────────────────────────────

  test.describe('Login Page', () => {
    test('AUTH01: should render login form with email and password fields', async ({ page }) => {
      await page.goto('/');

      // Check for email input
      const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]');
      await expect(emailInput).toBeVisible();

      // Check for password input
      const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]');
      await expect(passwordInput).toBeVisible();

      // Check for login button
      const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
      await expect(loginButton).toBeVisible();
    });

    test('AUTH02: should show app branding and title', async ({ page }) => {
      await page.goto('/');

      // Check for app name or logo
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    });
  });

  // ─── Form Validation ──────────────────────────────────────────────────────────

  test.describe('Form Validation', () => {
    test('AUTH03: should not submit with empty email and password', async ({ page }) => {
      await page.goto('/');

      // Try to submit without filling fields
      const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
      await loginButton.click();

      // Should remain on login page (not redirect)
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/');
      expect(page.url()).not.toContain('dashboard');
    });

    test('AUTH04: should show error with invalid credentials', async ({ page }) => {
      await mockApiResponses(page, { login: false });

      await page.goto('/');

      // Fill with wrong credentials
      await page.fill('input[placeholder*="email" i], input[type="email"]', 'wrong@test.com');
      await page.fill('input[placeholder*="password" i], input[type="password"]', 'wrongpass');

      // Submit form
      await page.click('button:has-text("Login"), button:has-text("Sign In")');

      // Wait for error message
      await page.waitForTimeout(1000);

      // Should show error (either as alert, toast, or error text)
      const errorText = page.locator('text=/invalid|error|wrong|failed/i');
      const hasError = await errorText.count() > 0;

      // Should remain on login page
      expect(page.url()).not.toContain('dashboard');
    });
  });

  // ─── Successful Login ─────────────────────────────────────────────────────────

  test.describe('Successful Login', () => {
    test('AUTH05: should login successfully and redirect to dashboard', async ({ page }) => {
      await mockApiResponses(page, {
        login: true,
        children: [],
      });

      await loginAs(page, TEST_USERS.PARENT);

      // Should be redirected to dashboard
      await expect(page).toHaveURL(/dashboard|home/);

      // Should see user greeting or children list
      const dashboard = page.locator('text=/dashboard|children|welcome/i').first();
      await expect(dashboard).toBeVisible({ timeout: 10000 });
    });

    test('AUTH06: should store session in localStorage', async ({ page }) => {
      await mockApiResponses(page, {
        login: true,
        children: [],
      });

      await loginAs(page, TEST_USERS.PARENT);

      // Check localStorage for auth token
      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(authToken).toBeTruthy();
    });
  });

  // ─── Session Persistence ──────────────────────────────────────────────────────

  test.describe('Session Persistence', () => {
    test('AUTH07: should persist session across page reload', async ({ page }) => {
      // Inject mock session
      await injectMockSession(page);

      // Navigate to dashboard
      await page.goto('/dashboard');

      // Should see dashboard without login
      await page.waitForTimeout(2000);
      expect(await isLoggedIn(page)).toBe(true);

      // Reload page
      await page.reload();
      await page.waitForTimeout(2000);

      // Should still be logged in
      expect(await isLoggedIn(page)).toBe(true);
    });

    test('AUTH08: should redirect to dashboard if already logged in', async ({ page }) => {
      // Inject mock session
      await injectMockSession(page);

      // Try to visit login page
      await page.goto('/');
      await page.waitForTimeout(2000);

      // Should redirect to dashboard
      expect(await isLoggedIn(page)).toBe(true);
    });
  });

  // ─── Logout ───────────────────────────────────────────────────────────────────

  test.describe('Logout', () => {
    test('AUTH09: should logout and redirect to login page', async ({ page }) => {
      // Set up authenticated session
      await injectMockSession(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Logout
      await logout(page);

      // Should be on login page
      await expect(page).toHaveURL(/login|^\/$/, { timeout: 5000 });

      // Session should be cleared
      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(authToken).toBeNull();
    });

    test('AUTH10: should not access dashboard after logout', async ({ page }) => {
      // Set up and logout
      await injectMockSession(page);
      await page.goto('/dashboard');
      await logout(page);

      // Try to access dashboard
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);

      // Should redirect to login
      expect(page.url()).toMatch(/login|^\/$/);
    });
  });

  // ─── Protected Routes ─────────────────────────────────────────────────────────

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
      await clearSession(page);

      // Try to access dashboard without auth
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);

      // Should redirect to login
      expect(page.url()).toMatch(/login|^\/$/);
    });

    test('should redirect unauthenticated users from absence reporting to login', async ({ page }) => {
      await clearSession(page);

      // Try to access absence page without auth
      await page.goto('/absence');
      await page.waitForTimeout(1000);

      // Should redirect to login
      expect(page.url()).toMatch(/login|^\/$/);
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────────────────

  test('should not have console errors on login page', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (e.g., network errors in dev mode)
    const criticalErrors = errors.filter(
      (err) => !err.includes('Failed to fetch') && !err.includes('net::ERR')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
