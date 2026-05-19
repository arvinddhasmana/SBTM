/**
 * E2E: Route Selection Screen — Driver App (Expo Web)
 *
 * Covers route list rendering, AM/PM direction badges, and route card details.
 *
 * Test IDs: DA-RS01–DA-RS08
 */
import { test, expect, mockApiRoutes, injectDriverSession, MOCK_ROUTES } from './fixtures';

test.describe('Route Select – Driver App', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await injectDriverSession(page);
    await page.reload();
    await page.waitForSelector('[data-testid="route-select-screen"]', { timeout: 20_000 });
    await page.waitForTimeout(500);
  });

  test('DA-RS01: shows route select screen header', async ({ page }) => {
    await expect(page.locator('[data-testid="route-select-screen"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('DA-RS02: shows route list', async ({ page }) => {
    await expect(page.locator('[data-testid="route-list"]')).toBeVisible({ timeout: 10_000 });
  });

  test('DA-RS03: renders a card for each assigned route', async ({ page }) => {
    for (const route of MOCK_ROUTES) {
      await expect(page.locator(`[data-testid="route-card-${route.id}"]`)).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test('DA-RS04: route cards show route name', async ({ page }) => {
    await expect(page.getByText('Route AM-101')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Route PM-101')).toBeVisible({ timeout: 10_000 });
  });

  test('DA-RS05: route cards show school name', async ({ page }) => {
    await expect(page.getByText(/Test Elementary/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('DA-RS06: AM route card shows AM direction badge', async ({ page }) => {
    await expect(page.getByText('AM').first()).toBeVisible({ timeout: 10_000 });
  });

  test('DA-RS07: PM route card shows PM direction badge', async ({ page }) => {
    await expect(page.getByText('PM').first()).toBeVisible({ timeout: 10_000 });
  });

  test('DA-RS08: empty route list shows no route cards', async ({ page }) => {
    await mockApiRoutes(page, { routes: [] });
    // Re-inject session with empty routes
    const state = {
      state: {
        driver: {
          id: 'driver-e2e-1',
          name: 'Test Driver',
          vehicleId: 'BUS-01',
          assignedRoutes: [],
        },
        isAuthenticated: true,
        activeRoute: null,
        students: [],
        stops: [],
        routeDirection: 'AM',
        rosterLoadState: 'idle',
        rosterError: null,
        isOffline: false,
        visitedStopIds: [],
      },
      version: 0,
    };
    await page.evaluate(
      ([key, value]) => {
        localStorage.setItem(key, value);
      },
      ['driver-storage', JSON.stringify(state)],
    );
    await page.reload();
    await page.waitForTimeout(1500);
    // No route cards should be present
    const cards = page.locator('[data-testid^="route-card-"]');
    const count = await cards.count();
    expect(count).toBe(0);
  });
});
