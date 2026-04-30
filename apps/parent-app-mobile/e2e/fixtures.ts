/**
 * E2E Test Fixtures and Utilities for Parent Mobile App
 *
 * Provides reusable test utilities, mock data, and helper functions
 */
import { test as base, Page, expect } from '@playwright/test';

// ─── Test Users ──────────────────────────────────────────────────────────────

export const TEST_USERS = {
  PARENT: {
    email: 'parent@test.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'Parent',
  },
  PARENT_NO_CHILDREN: {
    email: 'parent.nochildren@test.com',
    password: 'password123',
    firstName: 'Childless',
    lastName: 'Parent',
  },
};

// ─── Mock Children Data ──────────────────────────────────────────────────────

export const MOCK_CHILDREN = [
  {
    id: 'child-1',
    firstName: 'John',
    lastName: 'Doe',
    grade: '5',
    school: 'Test Elementary',
    status: 'on_bus',
    routeId: 'route-1',
  },
  {
    id: 'child-2',
    firstName: 'Jane',
    lastName: 'Doe',
    grade: '3',
    school: 'Test Elementary',
    status: 'at_home',
    routeId: 'route-2',
  },
];

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Login as a specific user (uses data-testid selectors from Aurora Dark UI).
 */
export async function loginAs(
  page: Page,
  user: { email: string; password: string },
): Promise<void> {
  await page.goto('/');

  // Wait for login form
  await page.waitForSelector('[data-testid="login-email"]', { timeout: 15000 });

  // Fill in credentials
  await page.locator('[data-testid="login-email"]').fill(user.email);
  await page.locator('[data-testid="login-password"]').fill(user.password);

  // Click login button (RN-Web wraps GlassButton in a div role=button, so use the testID)
  await page.locator('[data-testid="login-submit"]').click();

  // Wait for dashboard to render. Single-page Expo Web app does not change URL,
  // so probe for the dashboard root testID instead.
  await page.waitForSelector('[data-testid="dashboard-screen"]', { timeout: 15000 });
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  const logoutButton = page
    .locator(
      '[data-testid="header-logout"], [aria-label="Logout" i], [aria-label="Log Out" i], [aria-label="Sign Out" i]',
    )
    .first();
  await logoutButton.click();

  // After logout, the login form should reappear.
  await page.waitForSelector('[data-testid="login-email"]', { timeout: 10000 });
}

/**
 * Check if user is logged in (dashboard is rendered)
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  return (await page.locator('[data-testid="dashboard-screen"]').count()) > 0;
}

/**
 * Collect console errors during test execution
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return errors;
}

/**
 * Mock API responses for testing.
 * Uses real gateway routes (`/api/v1/auth/login`, `/api/v1/parent/children`,
 * `/api/v1/notification-preferences`, etc.). Pass `scenarios.login = false`
 * to simulate a 401 on login.
 */
export async function mockApiResponses(
  page: Page,
  scenarios: {
    login?: boolean;
    children?: typeof MOCK_CHILDREN | any[];
    alerts?: any[];
    alertHistory?: any[];
    auditTrail?: any[];
    liveLocation?: any;
    notificationPreferences?: any;
    routeDetails?: any;
  },
): Promise<void> {
  // Auth login
  await page.route('**/api/v1/auth/login', async (route) => {
    if (scenarios.login === false) {
      await route.fulfill({ status: 401, json: { message: 'Invalid credentials' } });
    } else {
      await route.fulfill({
        status: 200,
        json: {
          accessToken: 'mock-jwt-token',
          user: {
            id: 'parent-1',
            email: TEST_USERS.PARENT.email,
            role: 'PARENT',
            firstName: TEST_USERS.PARENT.firstName,
            lastName: TEST_USERS.PARENT.lastName,
          },
        },
      });
    }
  });

  // Children list
  if (scenarios.children !== undefined) {
    await page.route('**/api/v1/parent/children', async (route) => {
      await route.fulfill({ status: 200, json: scenarios.children });
    });
  }

  // Active alerts (per-route)
  if (scenarios.alerts !== undefined) {
    await page.route('**/api/v1/alerts/parent-view/*', async (route) => {
      await route.fulfill({ status: 200, json: scenarios.alerts });
    });
  }

  // Alert history (used by Notifications)
  if (scenarios.alertHistory !== undefined) {
    await page.route('**/api/v1/alerts/parent-history', async (route) => {
      await route.fulfill({ status: 200, json: scenarios.alertHistory });
    });
  }

  // Audit trail (timeline)
  if (scenarios.auditTrail !== undefined) {
    await page.route('**/api/v1/alerts/*/audit-trail', async (route) => {
      await route.fulfill({ status: 200, json: scenarios.auditTrail });
    });
  }

  // Live location (per route)
  if (scenarios.liveLocation !== undefined) {
    await page.route('**/api/v1/routes/*/live-location', async (route) => {
      await route.fulfill({ status: 200, json: scenarios.liveLocation });
    });
  }

  // Notification preferences
  if (scenarios.notificationPreferences !== undefined) {
    await page.route('**/api/v1/notification-preferences', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 204, body: '' });
      } else {
        await route.fulfill({ status: 200, json: scenarios.notificationPreferences });
      }
    });
  }

  // Route details (reference)
  if (scenarios.routeDetails !== undefined) {
    await page.route('**/api/v1/routes/reference/*', async (route) => {
      await route.fulfill({ status: 200, json: scenarios.routeDetails });
    });
  }
}

/**
 * Wait for network to be idle (useful after form submissions)
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Inject mock session into localStorage (for testing session persistence)
 */
export async function injectMockSession(page: Page, user = TEST_USERS.PARENT): Promise<void> {
  await page.goto('/');

  await page.evaluate(
    ([userStr, token]) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', userStr);
    },
    [JSON.stringify(user), 'mock-jwt-token'],
  );
}

/**
 * Clear session from localStorage
 */
export async function clearSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

// ─── Custom Test Fixtures ────────────────────────────────────────────────────

export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Set up authenticated page
    await injectMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Use the authenticated page in the test
    await use(page);

    // Clean up after test
    await clearSession(page);
  },
});

export { expect };
