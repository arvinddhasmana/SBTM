/**
 * E2E fixtures for Driver App (Expo Web).
 *
 * Uses Playwright route intercepts for all API calls.
 * Session is injected via localStorage (Zustand `driver-storage` key).
 */
import { test as base, Page, expect } from '@playwright/test';

// ─── Constants ───────────────────────────────────────────────────────────────

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const TEST_DRIVER = {
  id: 'driver-e2e-1',
  email: 'driver@test.com',
  name: 'Test Driver',
  vehicleId: 'BUS-01',
  password: 'password123',
};

export const MOCK_ROUTES = [
  {
    id: 'route-am-1',
    name: 'Route AM-101',
    schoolId: 'school-1',
    schoolName: 'Test Elementary',
    direction: 'AM',
    startTime: '08:00',
    vehicleId: 'BUS-01',
    status: 'SCHEDULED',
  },
  {
    id: 'route-pm-1',
    name: 'Route PM-101',
    schoolId: 'school-1',
    schoolName: 'Test Elementary',
    direction: 'PM',
    startTime: '15:00',
    vehicleId: 'BUS-01',
    status: 'SCHEDULED',
  },
];

export const MOCK_DRIVER_AUTH_RESPONSE = {
  access_token: 'mock-driver-token',
  driver: {
    id: TEST_DRIVER.id,
    name: TEST_DRIVER.name,
    vehicleId: TEST_DRIVER.vehicleId,
    assignedRoutes: MOCK_ROUTES,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Mock all API calls used by the driver app.
 */
export async function mockApiRoutes(
  page: Page,
  overrides: {
    loginSuccess?: boolean;
    routes?: typeof MOCK_ROUTES | any[];
    alerts?: any[];
  } = {},
): Promise<void> {
  const routes = overrides.routes ?? MOCK_ROUTES;
  const alerts = overrides.alerts ?? [];

  // Auth login
  await page.route('**/api/v1/auth/login', (route) => {
    if (overrides.loginSuccess === false) {
      return route.fulfill({ status: 401, json: { message: 'Invalid credentials' } });
    }
    return route.fulfill({ status: 200, json: MOCK_DRIVER_AUTH_RESPONSE });
  });

  // Auth me (used by restoreSession on RouteSelect mount)
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      json: {
        id: TEST_DRIVER.id,
        driverId: TEST_DRIVER.id,
        email: TEST_DRIVER.email,
        firstName: 'Test',
        lastName: 'Driver',
      },
    }),
  );

  // Driver schedule / assigned routes (both paths used by the app).
  // mapScheduleToDriver in auth.service reads `routeId`, so we add it alongside `id`.
  const scheduledRoutes = routes.map((r: any) => ({ ...r, routeId: r.id ?? r.routeId }));
  await page.route('**/api/v1/driver/schedule', (route) =>
    route.fulfill({ status: 200, json: scheduledRoutes }),
  );
  await page.route('**/api/v1/driver/me/schedule', (route) =>
    route.fulfill({ status: 200, json: scheduledRoutes }),
  );

  // Active alerts for a route
  await page.route('**/api/v1/alerts/driver-view/**', (route) =>
    route.fulfill({ status: 200, json: alerts }),
  );

  // GPS update (fire-and-forget)
  await page.route('**/api/v1/gps/**', (route) => route.fulfill({ status: 204, body: '' }));

  // Presence updates
  await page.route('**/api/v1/presence/**', (route) => route.fulfill({ status: 204, body: '' }));
}

/**
 * Inject a mock authenticated driver session into localStorage.
 *
 * Sets both `auth_token` (so App.tsx's session-restore useEffect fires the
 * mocked /auth/me → /driver/me/schedule path) and `driver-storage` (Zustand
 * persist fallback).  Relying on Zustand async rehydration alone races with
 * setIsRestoring(false) in headless Playwright and never wins.
 */
export async function injectDriverSession(page: Page): Promise<void> {
  const state = {
    state: {
      driver: {
        ...MOCK_DRIVER_AUTH_RESPONSE.driver,
        assignedRoutes: MOCK_ROUTES,
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
    ([storageKey, storageValue, tokenKey, tokenValue]) => {
      localStorage.setItem(storageKey, storageValue);
      localStorage.setItem(tokenKey, tokenValue);
    },
    ['driver-storage', JSON.stringify(state), 'auth_token', MOCK_DRIVER_AUTH_RESPONSE.access_token],
  );
}

/**
 * Collect console errors during test.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

// ─── Custom test fixture ──────────────────────────────────────────────────────

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await injectDriverSession(page);
    await page.reload();
    await page.waitForTimeout(2000);
    await use(page);
    await page.evaluate(() => localStorage.clear());
  },
});

export { expect };
