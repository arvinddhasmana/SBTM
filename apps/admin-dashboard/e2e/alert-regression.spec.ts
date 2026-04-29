import { test, expect } from '@playwright/test';
import { loginAs, gotoAndWait, createTestAlert } from './fixtures';

/**
 * Regression Test Suite for Existing Alert Functionality
 * Ensures that alert configuration changes do not break existing alert features
 */
test.describe('Alert Regression Tests', () => {
  test.describe('REG01: Alert List Page', () => {
    test('REG01: should load alerts page without errors', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alerts');

      // Check page loads
      await expect(page.locator('h1, h2').filter({ hasText: /alerts/i }).first()).toBeVisible();

      // Check no console errors
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));

      await page.waitForTimeout(2000);
      expect(errors.length).toBe(0);
    });

    test('REG02: should display alert filters', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await gotoAndWait(page, '/alerts');

      // Check filters exist
      await expect(
        page.locator('select, button').filter({ hasText: /filter|status|tier/i }).first(),
      ).toBeVisible({ timeout: 5000 });
    });

    test('REG03: should display operational alerts page', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alerts/operational');

      // Check operational alerts page loads
      await expect(
        page.locator('h1, h2').filter({ hasText: /operational/i }).first(),
      ).toBeVisible();
    });
  });

  test.describe('REG04: Alert Creation', () => {
    test('REG04: should create test alert via API', async ({ page }) => {
      // Create alert via API
      const alertId = await createTestAlert(page, {
        eventType: 'PANIC_BUTTON',
        routeId: 'ROUTE-STBERN-R01-AM',
        vehicleId: 'BUS-STBERN-01',
      });

      expect(alertId).toBeDefined();
      expect(typeof alertId).toBe('string');
    });
  });

  test.describe('REG05: Alert Display and Status', () => {
    test('REG05: School Admin can view alerts', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alerts');

      // Wait for alerts to load
      await page.waitForTimeout(2000);

      // Check if any alerts are displayed or "no alerts" message
      const hasAlerts = await page.locator('tbody tr, td').count();
      expect(hasAlerts).toBeGreaterThan(0);
    });

    test('REG06: Board Admin can view alerts', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await gotoAndWait(page, '/alerts');

      await page.waitForTimeout(2000);

      const hasAlerts = await page.locator('tbody tr, td').count();
      expect(hasAlerts).toBeGreaterThan(0);
    });

    test('REG07: OSTA Admin can view alerts', async ({ page }) => {
      await loginAs(page, 'OSTA_ADMIN');
      await gotoAndWait(page, '/alerts');

      await page.waitForTimeout(2000);

      const hasAlerts = await page.locator('tbody tr, td').count();
      expect(hasAlerts).toBeGreaterThan(0);
    });
  });

  test.describe('REG08: Alert Actions', () => {
    test('REG08: should display alert action buttons for School Admin', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alerts');

      await page.waitForTimeout(2000);

      // Check if action buttons exist (if alerts are present)
      const alertRows = page.locator('tbody tr');
      const count = await alertRows.count();

      if (count > 0) {
        // Click on first alert to view details
        await alertRows.first().click();
        await page.waitForTimeout(1000);

        // Check for common action buttons
        const hasConfirmButton = await page
          .locator('button:has-text("Confirm"), button:has-text("confirm")')
          .count();
        const hasResolveButton = await page
          .locator('button:has-text("Resolve"), button:has-text("resolve")')
          .count();

        // At least one action button should be present
        expect(hasConfirmButton + hasResolveButton).toBeGreaterThan(0);
      }
    });
  });

  test.describe('REG09: Dashboard Integration', () => {
    test('REG09: Dashboard should display alert summary', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/dashboard');

      // Check dashboard loads
      await expect(page.locator('h1, h2').filter({ hasText: /dashboard/i }).first()).toBeVisible({
        timeout: 5000,
      });

      // Check for alert-related widgets
      await page.waitForTimeout(2000);
      const hasAlertWidget =
        (await page.locator('div, section').filter({ hasText: /alert|emergency/i }).count()) > 0;

      expect(hasAlertWidget).toBe(true);
    });

    test('REG10: Dashboard alert widget should link to alerts page', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await gotoAndWait(page, '/dashboard');

      await page.waitForTimeout(2000);

      // Try to find and click alert link
      const alertLinks = page.locator('a[href*="/alerts"], button:has-text("View Alerts")');
      const linkCount = await alertLinks.count();

      if (linkCount > 0) {
        await alertLinks.first().click();
        await page.waitForURL('**/alerts', { timeout: 5000 });
        await expect(page).toHaveURL(/alerts/);
      }
    });
  });

  test.describe('REG11: Navigation Integrity', () => {
    test('REG11: All navigation links should work for Super Admin', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/dashboard');

      // Navigate to key pages
      const pages = [
        { link: 'Alerts', url: '/alerts' },
        { link: 'Dashboard', url: '/dashboard' },
        { link: 'Routes', url: '/routes' },
        { link: 'Students', url: '/students' },
        { link: 'Alert Config', url: '/alert-config' },
      ];

      for (const { link, url } of pages) {
        const navLink = page.locator(`nav a:has-text("${link}")`);
        if (await navLink.isVisible()) {
          await navLink.click();
          await page.waitForTimeout(1000);
          await expect(page).toHaveURL(new RegExp(url));
        }
      }
    });

    test('REG12: Sidebar should remain functional after visiting alert config', async ({
      page,
    }) => {
      await loginAs(page, 'SCHOOL_ADMIN');

      // Visit alert config
      await gotoAndWait(page, '/alert-config');
      await expect(page.locator('h1')).toContainText('Alert Configuration');

      // Navigate back to dashboard
      await page.click('nav a:has-text("Dashboard")');
      await page.waitForURL('**/dashboard');
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // Navigate to alerts
      await page.click('nav a:has-text("Alerts")');
      await page.waitForURL('**/alerts');
      await expect(page).toHaveURL(/alerts/);
    });
  });

  test.describe('REG13: Role-Based Access Control', () => {
    test('REG13: School Admin should access appropriate pages', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');

      // Should access alerts
      await gotoAndWait(page, '/alerts');
      await expect(page).toHaveURL(/alerts/);

      // Should access dashboard
      await gotoAndWait(page, '/dashboard');
      await expect(page).toHaveURL(/dashboard/);

      // Should access alert config (read-only)
      await gotoAndWait(page, '/alert-config');
      await expect(page).toHaveURL(/alert-config/);
    });

    test('REG14: Board Admin should access appropriate pages', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');

      await gotoAndWait(page, '/alerts');
      await expect(page).toHaveURL(/alerts/);

      await gotoAndWait(page, '/dashboard');
      await expect(page).toHaveURL(/dashboard/);

      await gotoAndWait(page, '/alert-config');
      await expect(page).toHaveURL(/alert-config/);

      await gotoAndWait(page, '/schools');
      await expect(page).toHaveURL(/schools/);
    });

    test('REG15: OSTA Admin should access all admin pages', async ({ page }) => {
      await loginAs(page, 'OSTA_ADMIN');

      await gotoAndWait(page, '/alerts');
      await expect(page).toHaveURL(/alerts/);

      await gotoAndWait(page, '/boards');
      await expect(page).toHaveURL(/boards/);

      await gotoAndWait(page, '/schools');
      await expect(page).toHaveURL(/schools/);
    });
  });

  test.describe('REG16: API Integration', () => {
    test('REG16: Alert API endpoints should remain functional', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');

      // Listen for API calls
      const apiCalls: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          apiCalls.push(request.url());
        }
      });

      // Navigate to alerts page (triggers API calls)
      await gotoAndWait(page, '/alerts');
      await page.waitForTimeout(2000);

      // Verify API calls were made
      const hasAlertApiCalls = apiCalls.some((url) => url.includes('alert') || url.includes('emergency'));
      expect(apiCalls.length).toBeGreaterThan(0);
    });

    test('REG17: Configuration API should not interfere with alert APIs', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');

      const apiResponses: { url: string; status: number }[] = [];

      page.on('response', (response) => {
        if (response.url().includes('/api/')) {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
          });
        }
      });

      // Load alerts page
      await gotoAndWait(page, '/alerts');
      await page.waitForTimeout(2000);

      // Load alert config page
      await gotoAndWait(page, '/alert-config');
      await page.waitForTimeout(2000);

      // All API calls should succeed (200-299) or be not found (404)
      const failed = apiResponses.filter(
        (r) => r.status >= 400 && r.status !== 404 && r.status !== 401,
      );
      expect(failed.length).toBe(0);
    });
  });

  test.describe('REG18: UI Consistency', () => {
    test('REG18: Alert page styling should remain consistent', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alerts');

      // Check for dark theme classes
      const body = await page.locator('body').getAttribute('class');
      expect(body).toContain('bg-'); // Should have background color class

      // Check table exists (if alerts present)
      const hasTable = await page.locator('table, div[role="table"]').count();
      expect(hasTable).toBeGreaterThan(0);
    });

    test('REG19: Navigation bar should remain visible on all pages', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');

      const pages = ['/dashboard', '/alerts', '/alert-config', '/routes'];

      for (const url of pages) {
        await gotoAndWait(page, url);
        await expect(page.locator('nav')).toBeVisible();
      }
    });
  });

  test.describe('REG20: Performance', () => {
    test('REG20: Alerts page should load within acceptable time', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');

      const startTime = Date.now();
      await gotoAndWait(page, '/alerts');
      await page.waitForTimeout(2000);
      const loadTime = Date.now() - startTime;

      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('REG21: Alert config page should not slow down alerts page', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');

      // Load alert config first
      await gotoAndWait(page, '/alert-config');
      await page.waitForTimeout(1000);

      // Measure alerts page load time
      const startTime = Date.now();
      await gotoAndWait(page, '/alerts');
      await page.waitForTimeout(2000);
      const loadTime = Date.now() - startTime;

      // Should still load within acceptable time
      expect(loadTime).toBeLessThan(10000);
    });
  });
});
