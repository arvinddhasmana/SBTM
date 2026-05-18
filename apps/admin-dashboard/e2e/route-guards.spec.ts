/**
 * E2E: Route guard enforcement
 *
 * Verifies that direct URL navigation to restricted pages redirects the user
 * to /dashboard instead of rendering the page content.
 *
 * Restriction matrix:
 *   /vehicles  — SUPER_ADMIN, STA_ADMIN only
 *   /boards    — SUPER_ADMIN, STA_ADMIN only
 *   /schools   — SUPER_ADMIN, STA_ADMIN, BOARD_ADMIN only
 *   /users     — SUPER_ADMIN only
 *
 * Test IDs: RG01–RG16
 */
import { test, expect } from '@playwright/test';
import { loginAs, gotoAndWait, collectConsoleErrors } from './fixtures';

test.describe('RG: Route Guards', () => {
  // ─── SUPER_ADMIN has access to everything ──────────────────────────────────

  test.describe('SUPER_ADMIN can access all routes', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
    });

    /** RG01 – SUPER_ADMIN can access /vehicles */
    test('RG01 – SUPER_ADMIN can navigate to /vehicles', async ({ page }) => {
      await page.goto('/vehicles', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/vehicles/);
    });

    /** RG02 – SUPER_ADMIN can access /boards */
    test('RG02 – SUPER_ADMIN can navigate to /boards', async ({ page }) => {
      await page.goto('/boards', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/boards/);
    });

    /** RG03 – SUPER_ADMIN can access /schools */
    test('RG03 – SUPER_ADMIN can navigate to /schools', async ({ page }) => {
      await page.goto('/schools', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/schools/);
    });

    /** RG04 – SUPER_ADMIN can access /users */
    test('RG04 – SUPER_ADMIN can navigate to /users', async ({ page }) => {
      await page.goto('/users', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/users/);
    });
  });

  // ─── STA_ADMIN restrictions ───────────────────────────────────────────────

  test.describe('STA_ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'STA_ADMIN');
    });

    /** RG05 – STA_ADMIN can access /vehicles */
    test('RG05 – STA_ADMIN can navigate to /vehicles', async ({ page }) => {
      await page.goto('/vehicles', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/vehicles/);
    });

    /** RG06 – STA_ADMIN is blocked from /users (redirected to /dashboard) */
    test('RG06 – STA_ADMIN direct navigation to /users redirects to /dashboard', async ({
      page,
    }) => {
      await gotoAndWait(page, '/users');
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  // ─── BOARD_ADMIN restrictions ──────────────────────────────────────────────

  test.describe('BOARD_ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
    });

    /** RG07 – BOARD_ADMIN blocked from /vehicles → /dashboard */
    test('RG07 – BOARD_ADMIN direct navigation to /vehicles redirects to /dashboard', async ({
      page,
    }) => {
      const errors = collectConsoleErrors(page);
      await gotoAndWait(page, '/vehicles');
      await expect(page).toHaveURL(/\/dashboard/);
      expect(errors()).toHaveLength(0);
    });

    /** RG08 – BOARD_ADMIN blocked from /boards → /dashboard */
    test('RG08 – BOARD_ADMIN direct navigation to /boards redirects to /dashboard', async ({
      page,
    }) => {
      await gotoAndWait(page, '/boards');
      await expect(page).toHaveURL(/\/dashboard/);
    });

    /** RG09 – BOARD_ADMIN blocked from /users → /dashboard */
    test('RG09 – BOARD_ADMIN direct navigation to /users redirects to /dashboard', async ({
      page,
    }) => {
      await gotoAndWait(page, '/users');
      await expect(page).toHaveURL(/\/dashboard/);
    });

    /** RG10 – BOARD_ADMIN CAN access /schools */
    test('RG10 – BOARD_ADMIN can navigate to /schools', async ({ page }) => {
      await page.goto('/schools', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/schools/);
    });
  });

  // ─── SCHOOL_ADMIN restrictions ─────────────────────────────────────────────

  test.describe('SCHOOL_ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
    });

    /** RG11 – SCHOOL_ADMIN blocked from /vehicles → /dashboard */
    test('RG11 – SCHOOL_ADMIN direct navigation to /vehicles redirects to /dashboard', async ({
      page,
    }) => {
      const errors = collectConsoleErrors(page);
      await gotoAndWait(page, '/vehicles');
      await expect(page).toHaveURL(/\/dashboard/);
      expect(errors()).toHaveLength(0);
    });

    /** RG12 – SCHOOL_ADMIN blocked from /boards → /dashboard */
    test('RG12 – SCHOOL_ADMIN direct navigation to /boards redirects to /dashboard', async ({
      page,
    }) => {
      await gotoAndWait(page, '/boards');
      await expect(page).toHaveURL(/\/dashboard/);
    });

    /** RG13 – SCHOOL_ADMIN blocked from /schools → /dashboard */
    test('RG13 – SCHOOL_ADMIN direct navigation to /schools redirects to /dashboard', async ({
      page,
    }) => {
      await gotoAndWait(page, '/schools');
      await expect(page).toHaveURL(/\/dashboard/);
    });

    /** RG14 – SCHOOL_ADMIN blocked from /users → /dashboard */
    test('RG14 – SCHOOL_ADMIN direct navigation to /users redirects to /dashboard', async ({
      page,
    }) => {
      await gotoAndWait(page, '/users');
      await expect(page).toHaveURL(/\/dashboard/);
    });

    /** RG15 – SCHOOL_ADMIN CAN access /fleet-assignments (Assignments page) */
    test('RG15 – SCHOOL_ADMIN can navigate to /fleet-assignments', async ({ page }) => {
      await page.goto('/fleet-assignments', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/fleet-assignments/);
    });

    /** RG16 – SCHOOL_ADMIN CAN access /compliance */
    test('RG16 – SCHOOL_ADMIN can navigate to /compliance', async ({ page }) => {
      await page.goto('/compliance', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/compliance/);
    });
  });
});
