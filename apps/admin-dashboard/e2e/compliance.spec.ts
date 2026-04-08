/**
 * E2E: Compliance page — all admin roles
 *
 * Verifies that the Compliance page and its three API-backed tabs
 * (drivers/compliance, inspections, audit) load without 500 errors for
 * all four admin roles.
 *
 * Background: A bug in MultiTenancyGuard caused GET /compliance, /inspections
 * and /audit to return HTTP 500 for BOARD_ADMIN and SCHOOL_ADMIN because
 * `request.body` was undefined for GET requests. Fixed: `request.body ?? {}`.
 *
 * Test IDs: CP01–CP16
 */
import { test, expect } from '@playwright/test';
import { loginAs, ADMIN_ROLES, collectConsoleErrors, type TestRole } from './fixtures';

/** Intercept all three compliance API calls and assert they return 2xx. */
async function assertComplianceApiSucceeds(page: import('@playwright/test').Page) {
  // Arm response listeners BEFORE navigation — API calls fire during initial page load
  const makeWaiter = (path: string) =>
    page.waitForResponse((r) => r.url().includes(path) && r.request().method() === 'GET', {
      timeout: 8_000,
    });

  const compPromise = makeWaiter('/api/v1/compliance');
  const inspPromise = makeWaiter('/api/v1/inspections');
  const auditPromise = makeWaiter('/api/v1/audit');

  // Navigate after arming listeners
  await page.goto('/compliance', { waitUntil: 'domcontentloaded' }).catch(() => {});

  const [comp, insp, audit] = await Promise.all([compPromise, inspPromise, auditPromise]);

  return {
    '/compliance': comp.status(),
    '/inspections': insp.status(),
    '/audit': audit.status(),
  };
}

test.describe('CP: Compliance Page', () => {
  for (const role of ADMIN_ROLES) {
    test.describe(`${role}`, () => {
      test.beforeEach(async ({ page }) => {
        await loginAs(page, role as TestRole);
      });

      /** CP0x – compliance API returns 200 for this role */
      test(`CP – ${role} loads /compliance, /inspections, /audit without errors`, async ({
        page,
      }) => {
        const errors = collectConsoleErrors(page);
        const statuses = await assertComplianceApiSucceeds(page);

        expect(statuses['/compliance']).toBe(200);
        expect(statuses['/inspections']).toBe(200);
        expect(statuses['/audit']).toBe(200);
        expect(errors().filter((e) => e.includes('500'))).toHaveLength(0);
      });

      /** CP0x – Compliance page heading is visible */
      test(`CP – ${role} sees "Compliance & Safety" heading`, async ({ page }) => {
        await page.goto('/compliance', { waitUntil: 'domcontentloaded' }).catch(() => {});
        await expect(page.getByRole('heading', { name: /Compliance & Safety/i })).toBeVisible();
      });

      /** CP0x – All three tabs are present */
      test(`CP – ${role} sees drivers, inspections and audit tabs`, async ({ page }) => {
        await page.goto('/compliance', { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('button', { name: /drivers/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /inspections/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /audit/i })).toBeVisible();
      });

      /** CP0x – Clicking each tab produces no console errors */
      test(`CP – ${role} can switch compliance tabs without errors`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await page.goto('/compliance', { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /inspections/i }).click();
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: /audit/i }).click();
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: /drivers/i }).click();
        await page.waitForTimeout(500);
        expect(errors().filter((e) => e.includes('500'))).toHaveLength(0);
      });
    });
  }
});
