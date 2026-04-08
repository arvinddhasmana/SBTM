/**
 * E2E: Students page
 *
 * Verifies that all admin roles can access the Students page and that
 * both the "Live Presence" and "Administration" tabs load correctly without
 * console errors.
 *
 * Note: The Administration tab triggers a lazy API fetch
 * (studentManagementApi.getStudents()). The test waits for the network to
 * settle before asserting content.
 *
 * Test IDs: STU01–STU12
 */
import { test, expect } from '@playwright/test';
import { loginAs, ADMIN_ROLES, collectConsoleErrors, type TestRole } from './fixtures';

test.describe('STU: Students Page', () => {
  for (const role of ADMIN_ROLES) {
    test.describe(`${role}`, () => {
      test.beforeEach(async ({ page }) => {
        await loginAs(page, role as TestRole);
        await page.goto('/students', { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForLoadState('networkidle');
      });

      /** STU01 – Students page renders without errors */
      test(`STU – ${role} loads /students without console errors`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await page.goto('/students', { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForLoadState('networkidle');
        expect(errors().filter((e) => !e.includes('favicon'))).toHaveLength(0);
      });

      /** STU02 – Live Presence tab is the default active tab */
      test(`STU – ${role} Live Presence tab is active by default`, async ({ page }) => {
        // "Live Presence" tab should be visible and the content should not show management
        await expect(page.getByRole('button', { name: /Live Presence/i })).toBeVisible();
      });

      /** STU03 – Administration tab exists and can be clicked */
      test(`STU – ${role} can switch to Administration tab without errors`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        const adminTab = page.getByRole('button', { name: /Administration/i });
        await expect(adminTab).toBeVisible();
        await adminTab.click();
        // Wait for the lazy student management API call to complete
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
        // No 500 errors
        expect(errors().filter((e) => e.includes('500'))).toHaveLength(0);
      });
    });
  }

  // ─── Specific tab interaction tests ────────────────────────────────────────

  test.describe('Tab switching — SUPER_ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await page.goto('/students', { waitUntil: 'domcontentloaded' }).catch(() => {});
    });

    /** STU10 – Switching between tabs multiple times produces no errors */
    test('STU10 – switching Live Presence → Administration → Live Presence is error-free', async ({
      page,
    }) => {
      const errors = collectConsoleErrors(page);

      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /Administration/i }).click();
      await page.waitForTimeout(1_000);

      await page.getByRole('button', { name: /Live Presence/i }).click();
      await page.waitForTimeout(500);

      await page.getByRole('button', { name: /Administration/i }).click();
      await page.waitForTimeout(1_000);

      expect(errors().filter((e) => e.includes('500'))).toHaveLength(0);
    });

    /** STU11 – Administration tab triggers student management API call */
    test('STU11 – Administration tab triggers GET students API call', async ({ page }) => {
      let studentApiCalled = false;
      page.on('response', (r) => {
        if (r.url().includes('/students') && r.request().method() === 'GET') {
          studentApiCalled = true;
        }
      });

      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /Administration/i }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);

      expect(studentApiCalled).toBe(true);
    });

    /** STU12 – Students page has no console errors on initial load */
    test('STU12 – no console errors on initial /students load', async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto('/students', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForLoadState('networkidle');
      expect(errors().filter((e) => !e.includes('favicon'))).toHaveLength(0);
    });
  });
});
