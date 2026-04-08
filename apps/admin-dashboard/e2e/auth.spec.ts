/**
 * E2E: Authentication flows
 *
 * Covers:
 *   - Login page rendering
 *   - Form validation (empty fields, wrong credentials)
 *   - DRIVER/PARENT cannot access the admin dashboard
 *   - Stale non-admin localStorage is cleared on app initialisation
 *   - Admin session persists across page reload
 *   - Logout clears session
 *
 * Test IDs: AT01–AT12
 */
import { test, expect } from '@playwright/test';
import { loginAs, injectNonAdminSession, collectConsoleErrors, TEST_USERS } from './fixtures';

test.describe('AT: Authentication', () => {
  // ─── Login Page ──────────────────────────────────────────────────────────────

  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate first — localStorage is inaccessible on about:blank
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.clear());
    });

    /** AT01 — Login form renders all required elements */
    test('AT01 – renders login form with email, password and sign-in button', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /OSTA Admin Dashboard/i })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
    });

    /** AT02 — Submitting empty form shows validation error */
    test('AT02 – shows "Please enter both email and password" on empty submit', async ({
      page,
    }) => {
      await page.getByRole('button', { name: /Sign In/i }).click();
      await expect(page.getByText(/Please enter both email and password/i)).toBeVisible();
    });

    /** AT03 — Wrong credentials show generic error */
    test('AT03 – shows "Invalid credentials" for bad email/password', async ({ page }) => {
      await page.locator('input[type="email"]').fill('nobody@sbtm.demo');
      await page.locator('input[type="password"]').fill('WrongPass99!');
      await page.getByRole('button', { name: /Sign In/i }).click();
      await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 8_000 });
    });
  });

  // ─── DRIVER / PARENT Blocking ─────────────────────────────────────────────

  test.describe('Non-admin Role Blocking', () => {
    /** AT04 — DRIVER stale localStorage cleared, forced back to /login */
    test('AT04 – DRIVER stale session is detected, localStorage cleared and redirected to /login', async ({
      page,
    }) => {
      await injectNonAdminSession(page, 'DRIVER');
      await page.waitForTimeout(800);

      await expect(page).toHaveURL(/\/login/);
      const stored = await page.evaluate(() => localStorage.getItem('auth_user'));
      expect(stored).toBeNull();
    });

    /** AT05 — PARENT stale localStorage cleared, forced back to /login */
    test('AT05 – PARENT stale session is detected, localStorage cleared and redirected to /login', async ({
      page,
    }) => {
      await injectNonAdminSession(page, 'PARENT');
      await page.waitForTimeout(800);

      await expect(page).toHaveURL(/\/login/);
      const stored = await page.evaluate(() => localStorage.getItem('auth_user'));
      expect(stored).toBeNull();
    });

    /** AT06 — DRIVER cannot force-navigate to /dashboard */
    test('AT06 – DRIVER is redirected away from /dashboard to /login', async ({ page }) => {
      await injectNonAdminSession(page, 'DRIVER');
      await page.goto('/dashboard');
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/login/);
    });

    /** AT07 — PARENT cannot force-navigate to /dashboard */
    test('AT07 – PARENT is redirected away from /dashboard to /login', async ({ page }) => {
      await injectNonAdminSession(page, 'PARENT');
      await page.goto('/dashboard');
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/login/);
    });

    /** AT08 — DRIVER cannot navigate to any protected admin page */
    test('AT08 – DRIVER cannot access /compliance via direct URL', async ({ page }) => {
      await page.goto('/login');
      await page.evaluate(
        (u) => localStorage.setItem('auth_user', JSON.stringify(u)),
        TEST_USERS.DRIVER,
      );
      await page.goto('/compliance');
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // ─── Session Persistence ─────────────────────────────────────────────────

  test.describe('Session Persistence', () => {
    test.beforeEach(async ({ page }) => {
      // Clear any auth state left by previous tests (shared browser context).
      await page.context().clearCookies();
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.clear());
    });
    /** AT09 — Admin session survives page reload */
    test('AT09 – SUPER_ADMIN session persists across page reload', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await page.reload();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/dashboard/);
    });

    /** AT10 — Clicking Logout clears session and redirects to /login */
    test('AT10 – Logout clears localStorage and redirects to /login', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await page.getByRole('button', { name: /Logout/i }).click();
      await expect(page).toHaveURL(/\/login/);
      const stored = await page.evaluate(() => localStorage.getItem('auth_user'));
      expect(stored).toBeNull();
    });

    /** AT11 — Unauthenticated user visiting /dashboard redirected to /login */
    test('AT11 – unauthenticated direct navigation to /dashboard redirects to /login', async ({
      page,
    }) => {
      // Navigate to the app first so localStorage is accessible
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.clear());
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/login/);
    });

    /** AT12 — Already-logged-in admin visiting /login is redirected to /dashboard */
    test('AT12 – already authenticated admin visiting /login is redirected to /dashboard', async ({
      page,
    }) => {
      await loginAs(page, 'OSTA_ADMIN');
      // PublicRoute redirects authenticated admins to /dashboard — absorb ERR_ABORTED
      await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
});
