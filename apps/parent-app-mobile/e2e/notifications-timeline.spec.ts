/**
 * E2E: Notifications timeline expansion
 *
 * Logs in, opens Notifications, expands an alert's audit timeline, and
 * confirms the timeline section becomes visible.
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

const HISTORY_ALERT = {
  id: 'alert-h1',
  eventType: 'LATE_ARRIVAL',
  severity: 'MEDIUM',
  description: 'Bus delayed',
  routeId: FULL_CHILDREN[0].routeId,
  vehicleId: 'BUS-101',
  driverId: 'driver-1',
  timestamp: new Date().toISOString(),
  status: 'RESOLVED',
};

const AUDIT = [
  {
    id: 'evt-1',
    eventType: 'CREATED',
    eventTimestamp: new Date(Date.now() - 60_000).toISOString(),
    actorName: 'System',
    notes: 'Alert generated',
  },
  {
    id: 'evt-2',
    eventType: 'RESOLVED',
    eventTimestamp: new Date().toISOString(),
    actorName: 'System',
    notes: 'Alert resolved',
  },
];

test.describe('Notifications timeline expansion', () => {
  test('toggling an alert reveals its audit timeline', async ({ page }) => {
    await mockApiResponses(page, {
      login: true,
      children: FULL_CHILDREN,
      alerts: [],
      alertHistory: [HISTORY_ALERT],
      auditTrail: AUDIT,
    });

    await loginAs(page, TEST_USERS.PARENT);
    await page.locator('[data-testid="header-notifications"]').click();
    await expect(page.locator('[data-testid="notifications-screen"]')).toBeVisible({
      timeout: 10000,
    });

    const toggle = page.locator(`[data-testid="timeline-toggle-${HISTORY_ALERT.id}"]`);
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(page.locator(`[data-testid="timeline-${HISTORY_ALERT.id}"]`)).toBeVisible({
      timeout: 10000,
    });
  });

  test('filter chips are visible on the notifications screen', async ({ page }) => {
    await mockApiResponses(page, {
      login: true,
      children: FULL_CHILDREN,
      alerts: [],
      alertHistory: [],
    });
    await loginAs(page, TEST_USERS.PARENT);
    await page.locator('[data-testid="header-notifications"]').click();
    await expect(page.locator('[data-testid="notifications-filter-row"]')).toBeVisible();
    await expect(page.locator('[data-testid="notifications-filter-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="notifications-filter-active"]')).toBeVisible();
    await expect(page.locator('[data-testid="notifications-filter-today"]')).toBeVisible();
    await expect(page.locator('[data-testid="notifications-filter-week"]')).toBeVisible();
  });
});
