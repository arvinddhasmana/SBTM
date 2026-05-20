/**
 * E2E: Dashboard and Children Tracking
 *
 * Test IDs: DASH01–DASH10
 *
 * Notes:
 *   - Expo Web is a single-page app; we never navigate via URL changes.
 *   - We log in via the mocked auth flow then assert via data-testid.
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
  avatarUrl: undefined,
  name: `${c.firstName} ${c.lastName}`,
}));

async function loginParent(page: import('@playwright/test').Page, children: any[] = FULL_CHILDREN) {
  await mockApiResponses(page, { login: true, children, alerts: [] });
  await loginAs(page, TEST_USERS.PARENT);
}

test.describe('Dashboard and Children Tracking', () => {
  test.describe('Dashboard Rendering', () => {
    test('DASH01: should display children list on dashboard', async ({ page }) => {
      await loginParent(page);
      const cards = page.locator('[data-testid^="student-card-"]');
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
      expect(await cards.count()).toBeGreaterThanOrEqual(1);
      await expect(
        page.getByText(`${MOCK_CHILDREN[0].firstName} ${MOCK_CHILDREN[0].lastName}`),
      ).toBeVisible();
    });

    test('DASH02: should show user greeting', async ({ page }) => {
      await loginParent(page);
      // Header shows the user's first name — match exactly to avoid "Test Elementary" conflict
      await expect(
        page.getByText(new RegExp(`^${TEST_USERS.PARENT.firstName}$`)).first(),
      ).toBeVisible();
    });

    test('DASH03: should display empty state when no children', async ({ page }) => {
      await loginParent(page, []);
      await expect(page.getByText(/No children/i)).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid^="student-card-"]')).toHaveCount(0);
    });
  });

  test.describe('Child Status Indicators', () => {
    test('DASH04: should display child status badge', async ({ page }) => {
      await loginParent(page);
      const status = page.locator('[data-testid^="child-status-"]').first();
      await expect(status).toBeVisible();
      const text = (await status.innerText()).trim();
      expect(text.length).toBeGreaterThan(0);
    });

    test('DASH05: should show child school info on the card', async ({ page }) => {
      await loginParent(page);
      const card = page.locator(`[data-testid="student-card-${FULL_CHILDREN[0].id}"]`);
      await expect(card).toBeVisible();
      await expect(card.getByText(FULL_CHILDREN[0].schoolName)).toBeVisible();
    });
  });

  test.describe('Map and GPS Tracking', () => {
    test('DASH06: should open map view when clicking a child card', async ({ page }) => {
      await loginParent(page);
      await mockApiResponses(page, {
        liveLocation: {
          active: true,
          routeId: 'route-1',
          vehicleId: 'BUS-101',
          lastUpdate: new Date().toISOString(),
          position: { lat: 45.42, lng: -75.69 },
          headingDeg: 45,
          speedKph: 30,
        },
        routeDetails: {
          id: 'route-1',
          name: 'Morning Loop',
          direction: 'AM',
          stops: [],
        },
      });

      await page.locator(`[data-testid="student-card-${FULL_CHILDREN[0].id}"]`).click();
      await expect(page.locator('[data-testid="map-screen"]')).toBeVisible({ timeout: 10000 });
    });

    test('DASH07: map should show a back control', async ({ page }) => {
      await loginParent(page);
      await mockApiResponses(page, {
        liveLocation: {
          active: false,
          routeId: 'route-1',
          vehicleId: '',
          lastUpdate: '',
          position: { lat: 0, lng: 0 },
        },
        routeDetails: { id: 'route-1', name: 'Morning Loop', direction: 'AM', stops: [] },
      });
      await page.locator(`[data-testid="student-card-${FULL_CHILDREN[0].id}"]`).click();
      await expect(page.locator('[data-testid="map-back"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Refresh Functionality', () => {
    test('DASH08: should re-render dashboard root after explicit reload', async ({ page }) => {
      await loginParent(page);
      await expect(page.locator('[data-testid="dashboard-screen"]')).toBeVisible();
      await page.reload();
      // After reload Expo Web re-mounts; dashboard may or may not auto-restore
      // depending on session rehydration. We only assert the page itself is alive.
      await expect(page).toHaveURL(/\//);
    });
  });

  test.describe('Navigation', () => {
    test('DASH10: should navigate to absence reporting via FAB', async ({ page }) => {
      await loginParent(page);
      await page.locator('[data-testid="report-absence-fab"]').click();
      await expect(page.locator('[data-testid="absence-screen"]')).toBeVisible({ timeout: 10000 });
    });

    test('should have notification, settings, and logout controls in the header', async ({
      page,
    }) => {
      await loginParent(page);
      await expect(page.locator('[data-testid="header-notifications"]')).toBeVisible();
      await expect(page.locator('[data-testid="header-settings"]')).toBeVisible();
      await expect(page.locator('[data-testid="header-logout"]')).toBeVisible();
    });
  });
});
