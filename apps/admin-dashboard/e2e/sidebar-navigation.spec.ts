/**
 * E2E: Sidebar role-based navigation
 *
 * Verifies that each role sees exactly the correct set of navigation items
 * in the sidebar, and that restricted items are not rendered.
 *
 * Navigation matrix (per docs/prd/v4/RolesAndWorkflows.md §6):
 *
 *   Item        | SUPER | OSTA | BOARD | SCHOOL
 *   ------------|-------|------|-------|-------
 *   Dashboard   |  ✓   |  ✓  |  ✓   |  ✓
 *   Alerts      |  ✓   |  ✓  |  ✓   |  ✓
 *   Operational |  ✓   |  ✓  |  ✓   |  ✓
 *   Routes      |  ✓   |  ✓  |  ✓   |  ✓
 *   Planner     |  ✓   |  ✓  |  ✓   |  ✓
 *   Compliance  |  ✓   |  ✓  |  ✓   |  ✓
 *   Assignments |  ✓   |  ✓  |  ✓   |  ✓
 *   Students    |  ✓   |  ✓  |  ✓   |  ✓
 *   Absences    |  ✓   |  ✓  |  ✓   |  ✓
 *   Settings    |  ✓   |  ✓  |  ✓   |  ✓
 *   Fleet       |  ✓   |  ✓  |  ✗   |  ✗
 *   Boards      |  ✓   |  ✓  |  ✗   |  ✗
 *   Schools     |  ✓   |  ✓  |  ✓   |  ✗
 *   Users       |  ✓   |  ✗  |  ✗   |  ✗
 *
 * Test IDs: SN01–SN18
 */
import { test, expect, type Locator } from '@playwright/test';
import { loginAs, COMMON_NAV_ITEMS, collectConsoleErrors, TEST_USERS } from './fixtures';

// Helper: assert an item IS visible in nav
async function expectNavItem(navLocator: Locator, label: string) {
  await expect(navLocator.getByText(label, { exact: false })).toBeVisible();
}

// Helper: assert an item is NOT in nav
async function expectNoNavItem(navLocator: Locator, label: string) {
  await expect(navLocator.getByText(label, { exact: false })).not.toBeVisible();
}

test.describe('SN: Sidebar Role-Based Navigation', () => {
  // ─── SUPER_ADMIN ───────────────────────────────────────────────────────────

  test.describe('SUPER_ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
    });

    /** SN01 – SUPER_ADMIN sees all 10 common items */
    test('SN01 – sees all common admin navigation items', async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const nav = page.locator('nav');
      for (const item of COMMON_NAV_ITEMS) {
        await expectNavItem(nav, item);
      }
      expect(errors()).toHaveLength(0);
    });

    /** SN02 – SUPER_ADMIN sees restricted items: Fleet, Boards, Schools, Users */
    test('SN02 – sees Fleet, Boards, Schools and Users nav items', async ({ page }) => {
      const nav = page.locator('nav');
      await expectNavItem(nav, 'Fleet');
      await expectNavItem(nav, 'Boards');
      await expectNavItem(nav, 'Schools');
      await expectNavItem(nav, 'Users');
    });

    /** SN03 – Fleet nav link points to /vehicles */
    test('SN03 – Fleet link URL is /vehicles', async ({ page }) => {
      await expect(page.locator('nav a[href="/vehicles"]')).toBeVisible();
    });

    /** SN04 – Users nav link points to /users */
    test('SN04 – Users link URL is /users', async ({ page }) => {
      await expect(page.locator('nav a[href="/users"]')).toBeVisible();
    });
  });

  // ─── OSTA_ADMIN ────────────────────────────────────────────────────────────

  test.describe('OSTA_ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'OSTA_ADMIN');
    });

    /** SN05 – OSTA_ADMIN sees all common items plus Fleet, Boards, Schools */
    test('SN05 – sees common items, Fleet, Boards and Schools', async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const nav = page.locator('nav');
      for (const item of COMMON_NAV_ITEMS) {
        await expectNavItem(nav, item);
      }
      await expectNavItem(nav, 'Fleet');
      await expectNavItem(nav, 'Boards');
      await expectNavItem(nav, 'Schools');
      expect(errors()).toHaveLength(0);
    });

    /** SN06 – OSTA_ADMIN does NOT see Users */
    test('SN06 – does not see Users nav item', async ({ page }) => {
      await expectNoNavItem(page.locator('nav'), 'Users');
    });
  });

  // ─── BOARD_ADMIN ───────────────────────────────────────────────────────────

  test.describe('BOARD_ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
    });

    /** SN07 – BOARD_ADMIN sees all 10 common items */
    test('SN07 – sees all common admin navigation items', async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const nav = page.locator('nav');
      for (const item of COMMON_NAV_ITEMS) {
        await expectNavItem(nav, item);
      }
      expect(errors()).toHaveLength(0);
    });

    /** SN08 – BOARD_ADMIN sees Schools */
    test('SN08 – sees Schools nav item', async ({ page }) => {
      await expectNavItem(page.locator('nav'), 'Schools');
    });

    /** SN09 – BOARD_ADMIN does NOT see Fleet, Boards or Users */
    test('SN09 – does not see Fleet, Boards or Users', async ({ page }) => {
      const nav = page.locator('nav');
      await expectNoNavItem(nav, 'Fleet');
      await expectNoNavItem(nav, 'Boards');
      await expectNoNavItem(nav, 'Users');
    });
  });

  // ─── SCHOOL_ADMIN ──────────────────────────────────────────────────────────

  test.describe('SCHOOL_ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
    });

    /** SN10 – SCHOOL_ADMIN sees all 10 common items */
    test('SN10 – sees exactly the 10 common admin navigation items', async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const nav = page.locator('nav');
      for (const item of COMMON_NAV_ITEMS) {
        await expectNavItem(nav, item);
      }
      expect(errors()).toHaveLength(0);
    });

    /** SN11 – SCHOOL_ADMIN does NOT see Fleet, Boards, Schools or Users */
    test('SN11 – does not see Fleet, Boards, Schools or Users', async ({ page }) => {
      const nav = page.locator('nav');
      await expectNoNavItem(nav, 'Fleet');
      await expectNoNavItem(nav, 'Boards');
      await expectNoNavItem(nav, 'Schools');
      await expectNoNavItem(nav, 'Users');
    });
  });

  // ─── Nav link routing verification ────────────────────────────────────────

  test.describe('Navigation Link URLs', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
    });

    /** SN12 – Assignments link points to /fleet-assignments */
    test('SN12 – Assignments nav link URL is /fleet-assignments', async ({ page }) => {
      await expect(page.locator('nav a[href="/fleet-assignments"]')).toBeVisible();
    });

    /** SN13 – Compliance link points to /compliance */
    test('SN13 – Compliance nav link URL is /compliance', async ({ page }) => {
      await expect(page.locator('nav a[href="/compliance"]')).toBeVisible();
    });

    /** SN14 – Clicking Dashboard link navigates to /dashboard */
    test('SN14 – clicking Dashboard navigates to /dashboard', async ({ page }) => {
      await page.locator('nav a[href="/dashboard"]').click();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    /** SN15 – Clicking Settings link navigates to /settings */
    test('SN15 – clicking Settings navigates to /settings', async ({ page }) => {
      await page.locator('nav a[href="/settings"]').click();
      await expect(page).toHaveURL(/\/settings/);
    });
  });

  // ─── Role identity display ─────────────────────────────────────────────────

  test.describe('Role Identity Display', () => {
    /** SN16 – Role label shown in header for SCHOOL_ADMIN */
    test('SN16 – SCHOOL_ADMIN role label is displayed in the header', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await expect(page.getByText('SCHOOL_ADMIN')).toBeVisible();
    });

    /** SN17 – Role label shown for BOARD_ADMIN */
    test('SN17 – BOARD_ADMIN role label is displayed in the header', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await expect(page.getByText('BOARD_ADMIN')).toBeVisible();
    });

    /** SN18 – Role label shown for OSTA_ADMIN */
    test('SN18 – OSTA_ADMIN role label is displayed in the header', async ({ page }) => {
      await loginAs(page, 'OSTA_ADMIN');
      await expect(page.getByText('OSTA_ADMIN')).toBeVisible();
    });
  });
});
