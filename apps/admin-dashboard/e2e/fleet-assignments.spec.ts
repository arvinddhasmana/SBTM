/**
 * E2E: Fleet & Assignments pages
 *
 * Fleet (/vehicles): Only SUPER_ADMIN and OSTA_ADMIN can access.
 * Assignments (/fleet-assignments): All admin roles can access;
 *   only OSTA_ADMIN sees the "Create Proposal" button.
 *
 * Test IDs: FA01–FA10
 */
import { test, expect } from '@playwright/test';
import { loginAs, gotoAndWait, collectConsoleErrors } from './fixtures';

test.describe('FA: Fleet & Assignments', () => {
  // ─── /vehicles (Fleet) ────────────────────────────────────────────────────

  test.describe('/vehicles page (Fleet)', () => {
    /** FA01 – SUPER_ADMIN can access /vehicles */
    test('FA01 – SUPER_ADMIN loads /vehicles without errors', async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await loginAs(page, 'SUPER_ADMIN');
      await page.goto('/vehicles', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/vehicles/);
      await page.waitForLoadState('networkidle');
      expect(errors().filter((e) => e.includes('500'))).toHaveLength(0);
    });

    /** FA02 – OSTA_ADMIN can access /vehicles */
    test('FA02 – OSTA_ADMIN loads /vehicles without errors', async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await loginAs(page, 'OSTA_ADMIN');
      await page.goto('/vehicles', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/vehicles/);
      await page.waitForLoadState('networkidle');
      expect(errors().filter((e) => e.includes('500'))).toHaveLength(0);
    });

    /** FA03 – BOARD_ADMIN is blocked from /vehicles */
    test('FA03 – BOARD_ADMIN is redirected away from /vehicles to /dashboard', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await gotoAndWait(page, '/vehicles');
      await expect(page).toHaveURL(/\/dashboard/);
    });

    /** FA04 – SCHOOL_ADMIN is blocked from /vehicles */
    test('FA04 – SCHOOL_ADMIN is redirected away from /vehicles to /dashboard', async ({
      page,
    }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/vehicles');
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  // ─── /fleet-assignments (Assignments) ─────────────────────────────────────

  test.describe('/fleet-assignments page (Assignments)', () => {
    /** FA05 – OSTA_ADMIN sees Fleet in sidebar (only OSTA/SUPER have it) */
    test('FA05 – OSTA_ADMIN sees Fleet item in sidebar', async ({ page }) => {
      await loginAs(page, 'OSTA_ADMIN');
      await expect(page.locator('nav').getByText('Fleet', { exact: false })).toBeVisible();
    });

    /** FA06 – SCHOOL_ADMIN does NOT see Fleet item in sidebar */
    test('FA06 – SCHOOL_ADMIN does not see Fleet item in sidebar', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await expect(page.locator('nav').getByText('Fleet', { exact: false })).not.toBeVisible();
    });

    /** FA07 – SCHOOL_ADMIN can access /fleet-assignments (Assignments, not Fleet) */
    test('FA07 – SCHOOL_ADMIN can access /fleet-assignments page', async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await loginAs(page, 'SCHOOL_ADMIN');
      await page.goto('/fleet-assignments', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/fleet-assignments/);
      await page.waitForLoadState('networkidle');
      expect(errors().filter((e) => e.includes('500'))).toHaveLength(0);
    });

    /** FA08 – BOARD_ADMIN can access /fleet-assignments */
    test('FA08 – BOARD_ADMIN can access /fleet-assignments page', async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await loginAs(page, 'BOARD_ADMIN');
      await page.goto('/fleet-assignments', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page).toHaveURL(/\/fleet-assignments/);
      await page.waitForLoadState('networkidle');
      expect(errors().filter((e) => e.includes('500'))).toHaveLength(0);
    });

    /** FA09 – OSTA_ADMIN sees Fleet Assignments heading */
    test('FA09 – OSTA_ADMIN sees Fleet Assignments page content', async ({ page }) => {
      await loginAs(page, 'OSTA_ADMIN');
      await page.goto('/fleet-assignments', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page.getByRole('heading', { name: /Fleet Assignments/i })).toBeVisible();
    });

    /** FA10 – SCHOOL_ADMIN sees Fleet Assignments heading (view-only, no Create Proposal) */
    test('FA10 – SCHOOL_ADMIN sees Fleet Assignments page content without Create Proposal button', async ({
      page,
    }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await page.goto('/fleet-assignments', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page.getByRole('heading', { name: /Fleet Assignments/i })).toBeVisible();
      // SCHOOL_ADMIN should not see the button to create proposals
      await expect(page.getByRole('button', { name: /Create Proposal/i })).not.toBeVisible();
    });
  });
});
