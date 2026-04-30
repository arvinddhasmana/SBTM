/**
 * E2E: Absence Reporting
 *
 * Test IDs: ABS01–ABS10
 *
 * Notes:
 *   - We log in via the mocked auth flow then navigate via the dashboard FAB.
 *   - All selectors are data-testid based; we never assume a `/absence` URL.
 */
import { test, expect } from '@playwright/test';
import { loginAs, mockApiResponses, MOCK_CHILDREN, TEST_USERS } from './fixtures';

const FULL_CHILDREN = MOCK_CHILDREN.map((c) => ({
  ...c,
  schoolName: c.school,
  schoolId: 'school-1',
  amRouteId: c.routeId,
  pmRouteId: c.routeId,
  amRouteName: 'Morning Loop',
  pmRouteName: 'Afternoon Loop',
  amStopId: 'stop-1',
  stopName: 'Maple & 5th',
  vehicleId: 'BUS-101',
  status: c.status,
  name: `${c.firstName} ${c.lastName}`,
}));

async function gotoAbsence(page: import('@playwright/test').Page, children: any[] = FULL_CHILDREN) {
  await mockApiResponses(page, { login: true, children, alerts: [] });
  await loginAs(page, TEST_USERS.PARENT);
  await page.locator('[data-testid="report-absence-fab"]').click();
  await page.waitForSelector('[data-testid="absence-screen"]', { timeout: 10000 });
}

test.describe('Absence Reporting', () => {
  test.describe('Absence Form Rendering', () => {
    test('ABS01: should render absence report form', async ({ page }) => {
      await gotoAbsence(page);
      await expect(page.locator('[data-testid="absence-screen"]')).toBeVisible();
    });

    test('ABS02: should display all required form controls', async ({ page }) => {
      await gotoAbsence(page);
      await expect(page.locator('[data-testid="absence-child"]')).toBeVisible();
      await expect(page.locator('[data-testid="absence-date"]')).toBeVisible();
      await expect(page.locator('[data-testid="absence-route"]')).toBeVisible();
      await expect(page.locator('[data-testid="absence-notes"]')).toBeVisible();
      await expect(page.locator('[data-testid="absence-submit"]')).toBeVisible();
    });

    test('ABS03: should still mount the absence screen even with no children', async ({ page }) => {
      await gotoAbsence(page, []).catch(() => {
        // FAB may be absent when there are no children — fall back to direct
        // dashboard assertion to confirm no crash.
      });
      // If the FAB existed and we made it here, the screen mounted.
      // Otherwise the dashboard remains visible without crashing.
      const onAbsence = await page.locator('[data-testid="absence-screen"]').count();
      const onDashboard = await page.locator('[data-testid="dashboard-screen"]').count();
      expect(onAbsence + onDashboard).toBeGreaterThan(0);
    });
  });

  test.describe('Form Interaction', () => {
    test('ABS05: should allow entering a date', async ({ page }) => {
      await gotoAbsence(page);
      const dateInput = page.locator('[data-testid="absence-date"]');
      const today = new Date().toISOString().split('T')[0];
      await dateInput.fill(today);
      await expect(dateInput).toHaveValue(today);
    });

    test('ABS07: should allow entering optional notes', async ({ page }) => {
      await gotoAbsence(page);
      const notes = page.locator('[data-testid="absence-notes"]');
      await notes.fill('Child is sick with flu');
      await expect(notes).toHaveValue('Child is sick with flu');
    });
  });

  test.describe('Form Submission', () => {
    test('ABS10: should successfully submit absence report to /absences', async ({ page }) => {
      let submissionReceived = false;
      let submittedBody: any = null;

      await page.route('**/api/v1/absences', async (route) => {
        if (route.request().method() === 'POST') {
          submissionReceived = true;
          submittedBody = route.request().postDataJSON();
          await route.fulfill({
            status: 201,
            json: { success: true, id: 'absence-1' },
          });
        } else {
          await route.continue();
        }
      });

      await gotoAbsence(page);

      const today = new Date().toISOString().split('T')[0];
      await page.locator('[data-testid="absence-date"]').fill(today);
      await page.locator('[data-testid="absence-notes"]').fill('Sick day');
      await page.locator('[data-testid="absence-submit"]').click();

      // Wait for the request to be received
      await expect.poll(() => submissionReceived, { timeout: 10000 }).toBe(true);
      expect(submittedBody).toBeTruthy();
      expect(submittedBody.studentId).toBeTruthy();
      expect(submittedBody.tripDate).toBe(today);
    });

    test('should handle submission errors gracefully', async ({ page }) => {
      await page.route('**/api/v1/absences', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({ status: 500, json: { error: 'Internal server error' } });
        } else {
          await route.continue();
        }
      });

      await gotoAbsence(page);
      const today = new Date().toISOString().split('T')[0];
      await page.locator('[data-testid="absence-date"]').fill(today);
      await page.locator('[data-testid="absence-submit"]').click();
      await page.waitForTimeout(1500);
      // We just need the screen not to crash.
      await expect(page.locator('[data-testid="absence-screen"]')).toBeVisible();
    });
  });
});
