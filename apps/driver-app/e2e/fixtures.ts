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
  await page.route(`${API_URL}/api/v1/auth/login`, (route) => {
    if (overrides.loginSuccess === false) {
      return route.fulfill({ status: 401, json: { message: 'Invalid credentials' } });
    }
    return route.fulfill({ status: 200, json: MOCK_DRIVER_AUTH_RESPONSE });
  });

  // Driver schedule / assigned routes
  await page.route(`${API_URL}/api/v1/driver/schedule`, (route) =>
    route.fulfill({ status: 200, json: routes }),
  );

  // Active alerts for a route
  await page.route(`${API_URL}/api/v1/alerts/driver-view/**`, (route) =>
    route.fulfill({ status: 200, json: alerts }),
  );

  // GPS update (fire-and-forget)
  await page.route(`${API_URL}/api/v1/gps/**`, (route) => route.fulfill({ status: 204, body: '' }));

  // Presence updates
  await page.route(`${API_URL}/api/v1/presence/**`, (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
}

/**
 * Inject a mock authenticated driver session into localStorage.
 * Zustand persists state under the 'driver-storage' key.
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
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    ['driver-storage', JSON.stringify(state)],
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
