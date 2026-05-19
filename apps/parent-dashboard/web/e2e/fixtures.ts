/**
 * E2E fixtures for Parent Dashboard (web).
 *
 * Uses Playwright route intercepts for all API calls — no real backend needed.
 * Auth is injected via localStorage so tests skip the full login flow where
 * appropriate.
 */
import { test as base, Page, expect } from '@playwright/test';

// ─── Constants ───────────────────────────────────────────────────────────────

export const API = 'http://localhost:3001';

export const TEST_USERS = {
  PARENT: {
    id: 'parent-web-1',
    email: 'parent@test.com',
    name: 'Test Parent',
    role: 'PARENT' as const,
    firstName: 'Test',
    lastName: 'Parent',
  },
};

export const MOCK_CHILDREN = [
  {
    id: 'child-1',
    name: 'John Doe',
    schoolName: 'Test Elementary',
    status: 'on_bus' as const,
    amRouteId: 'route-am-1',
    amRouteName: 'AM Route 1',
    pmRouteId: 'route-pm-1',
    pmRouteName: 'PM Route 1',
    routeId: 'route-am-1',
    vehicleId: 'BUS-01',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=JD',
  },
  {
    id: 'child-2',
    name: 'Jane Doe',
    schoolName: 'Test Elementary',
    status: 'at_home' as const,
    amRouteId: 'route-am-2',
    amRouteName: 'AM Route 2',
    pmRouteId: null,
    pmRouteName: null,
    routeId: 'route-am-2',
    vehicleId: 'BUS-02',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=JD2',
  },
];

export const MOCK_ALERT_HISTORY = [
  {
    id: 'alert-1',
    schoolId: 'school-1',
    vehicleId: 'BUS-01',
    routeId: 'route-am-1',
    driverId: 'driver-1',
    timestamp: new Date().toISOString(),
    lat: 45.4215,
    lng: -75.6972,
    eventType: 'LATE_ARRIVAL',
    description: 'Bus running 15 minutes late',
    status: 'RESOLVED' as const,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const MOCK_AUDIT_TRAIL = [
  {
    id: 'audit-1',
    alertId: 'alert-1',
    eventType: 'CONFIRMED',
    actorUserId: 'admin-1',
    actorRole: 'SCHOOL_ADMIN',
    notes: 'Confirmed by dispatcher',
    escalationLevel: null,
    eventTimestamp: new Date(Date.now() - 3500_000).toISOString(),
  },
  {
    id: 'audit-2',
    alertId: 'alert-1',
    eventType: 'RESOLVED',
    actorUserId: 'admin-1',
    actorRole: 'SCHOOL_ADMIN',
    notes: null,
    escalationLevel: null,
    eventTimestamp: new Date(Date.now() - 3000_000).toISOString(),
  },
];

export const MOCK_PREFS = [
  { eventType: 'BOARD', channel: 'PUSH', enabled: true },
  { eventType: 'BOARD', channel: 'EMAIL', enabled: false },
  { eventType: 'ALIGHT', channel: 'PUSH', enabled: true },
  { eventType: 'ALIGHT', channel: 'EMAIL', enabled: false },
  { eventType: 'EMERGENCY', channel: 'PUSH', enabled: true },
  { eventType: 'EMERGENCY', channel: 'EMAIL', enabled: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Mock all API routes for the parent dashboard.
 * Call this before navigating to any page.
 */
export async function mockApiRoutes(
  page: Page,
  overrides: {
    loginSuccess?: boolean;
    children?: typeof MOCK_CHILDREN | any[];
    alertHistory?: typeof MOCK_ALERT_HISTORY | any[];
    activeAlerts?: any[];
    auditTrail?: typeof MOCK_AUDIT_TRAIL | any[];
    prefs?: typeof MOCK_PREFS | any[];
  } = {},
): Promise<void> {
  const children = overrides.children ?? MOCK_CHILDREN;
  const alertHistory = overrides.alertHistory ?? [];
  const activeAlerts = overrides.activeAlerts ?? [];
  const auditTrail = overrides.auditTrail ?? MOCK_AUDIT_TRAIL;
  const prefs = overrides.prefs ?? MOCK_PREFS;

  // Session validation (called on every protected page load)
  await page.route(`${API}/api/v1/auth/me`, (route) =>
    route.fulfill({
      status: 200,
      json: { id: TEST_USERS.PARENT.id, email: TEST_USERS.PARENT.email, role: 'PARENT' },
    }),
  );

  // Login
  await page.route(`${API}/api/v1/auth/login`, (route) => {
    if (overrides.loginSuccess === false) {
      return route.fulfill({ status: 401, json: { message: 'Invalid credentials' } });
    }
    return route.fulfill({
      status: 200,
      json: {
        accessToken: 'mock-jwt-token',
        user: {
          id: TEST_USERS.PARENT.id,
          email: TEST_USERS.PARENT.email,
          role: 'PARENT',
          firstName: TEST_USERS.PARENT.firstName,
          lastName: TEST_USERS.PARENT.lastName,
        },
      },
    });
  });

  // Logout
  await page.route(`${API}/api/v1/auth/logout`, (route) =>
    route.fulfill({ status: 204, body: '' }),
  );

  // Children
  await page.route(`${API}/api/v1/parent/children`, (route) =>
    route.fulfill({ status: 200, json: children }),
  );

  // Active alerts (per route)
  await page.route(`${API}/api/v1/alerts/parent-view/**`, (route) => {
    const alert = activeAlerts[0];
    if (alert) {
      return route.fulfill({ status: 200, json: { ...alert, alertActive: true } });
    }
    return route.fulfill({ status: 200, json: { alertActive: false, message: 'No active alert' } });
  });

  // Alert history
  await page.route(`${API}/api/v1/alerts/parent-history`, (route) =>
    route.fulfill({ status: 200, json: alertHistory }),
  );

  // Audit trail
  await page.route(`${API}/api/v1/alerts/*/audit-trail`, (route) =>
    route.fulfill({ status: 200, json: auditTrail }),
  );

  // Notification preferences (GET + PUT)
  await page.route(`${API}/api/v1/notification-preferences`, (route) => {
    if (route.request().method() === 'PUT') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 200, json: prefs });
  });

  // Absence report
  await page.route(`${API}/api/v1/absences`, (route) =>
    route.fulfill({
      status: 201,
      json: {
        id: 'abs-1',
        studentId: children[0]?.id ?? 'child-1',
        guardianUserId: TEST_USERS.PARENT.id,
        schoolId: 'school-1',
        tripDate: new Date().toISOString().split('T')[0],
        routeType: 'BOTH',
        createdAt: new Date().toISOString(),
      },
    }),
  );
}

/**
 * Inject a mock authenticated session into localStorage.
 * Also mocks /auth/me so the AuthProvider accepts the stored session.
 */
export async function injectSession(page: Page): Promise<void> {
  const user = {
    id: TEST_USERS.PARENT.id,
    email: TEST_USERS.PARENT.email,
    name: TEST_USERS.PARENT.name,
    children: MOCK_CHILDREN,
  };

  await page.evaluate(
    ([userStr, token]) => {
      localStorage.setItem('parent_user', userStr);
      localStorage.setItem('auth_token', token);
    },
    [JSON.stringify(user), 'mock-jwt-token'],
  );
}

/**
 * Navigate to login page and sign in via the form.
 */
export async function loginViaForm(
  page: Page,
  email = TEST_USERS.PARENT.email,
  password = 'password123',
): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('input[id="email"]', { timeout: 15_000 });
  await page.locator('input[id="email"]').fill(email);
  await page.locator('input[id="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

/**
 * Collect JS console errors during a test.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

// ─── Custom test fixture: authenticatedPage ───────────────────────────────────

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await mockApiRoutes(page);
    await page.goto('/login');
    await injectSession(page);
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');
    await use(page);
    await page.evaluate(() => localStorage.clear());
  },
});

export { expect };
