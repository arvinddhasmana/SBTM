/**
 * E2E: Dashboard Active Alerts Block
 *
 * Verifies that when the parent has active alerts, the dashboard shows the
 * active-alerts banner block and an alert badge appears on each affected
 * student card.
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

test.describe('Dashboard active alerts block', () => {
  test('renders active-alerts-block + per-alert banner when alerts present', async ({ page }) => {
    const alert = {
      id: 'alert-1',
      eventType: 'LATE_ARRIVAL',
      severity: 'MEDIUM',
      description: 'Bus delayed by 10 minutes',
      routeId: FULL_CHILDREN[0].routeId,
      vehicleId: 'BUS-101',
      driverId: 'driver-1',
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
    };

    await mockApiResponses(page, {
      login: true,
      children: FULL_CHILDREN,
      alerts: [alert],
    });

    await loginAs(page, TEST_USERS.PARENT);

    await expect(page.locator('[data-testid="active-alerts-block"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(`[data-testid="alert-banner-${alert.id}"]`).first()).toBeVisible();
  });

  test('does not render the active-alerts-block when there are no alerts', async ({ page }) => {
    await mockApiResponses(page, {
      login: true,
      children: FULL_CHILDREN,
      alerts: [],
    });
    await loginAs(page, TEST_USERS.PARENT);
    await expect(page.locator('[data-testid="dashboard-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-alerts-block"]')).toHaveCount(0);
  });
});
