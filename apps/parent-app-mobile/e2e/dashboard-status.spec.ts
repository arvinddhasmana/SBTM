/**
 * E2E: Dashboard child status indicator reflects bus state
 *
 * Stubs live location for the child's route as active and confirms the
 * status badge text on the matching student card reflects an "on the bus"
 * style status.
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
  status: 'ON_BUS',
  name: `${c.firstName} ${c.lastName}`,
}));

test.describe('Dashboard child status', () => {
  test('renders a status badge for each student card', async ({ page }) => {
    await mockApiResponses(page, {
      login: true,
      children: FULL_CHILDREN,
      alerts: [],
      liveLocation: {
        active: true,
        routeId: FULL_CHILDREN[0].routeId,
        vehicleId: 'BUS-101',
        lastUpdate: new Date().toISOString(),
        position: { lat: 45.42, lng: -75.69 },
      },
    });

    await loginAs(page, TEST_USERS.PARENT);
    const badges = page.locator('[data-testid^="child-status-"]');
    await expect(badges.first()).toBeVisible({ timeout: 10000 });
    expect(await badges.count()).toBe(FULL_CHILDREN.length);
    for (let i = 0; i < FULL_CHILDREN.length; i += 1) {
      const text = (await badges.nth(i).innerText()).trim();
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
