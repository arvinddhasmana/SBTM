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
 * Login as a specific user
 */
export async function loginAs(
  page: Page,
  user: { email: string; password: string }
): Promise<void> {
  await page.goto('/');

  // Wait for login form to load
  await page.waitForSelector('input[placeholder*="email" i], input[type="email"]', {
    timeout: 10000,
  });

  // Fill in credentials
  await page.fill('input[placeholder*="email" i], input[type="email"]', user.email);
  await page.fill('input[placeholder*="password" i], input[type="password"]', user.password);

  // Click login button
  await page.click('button:has-text("Login"), button:has-text("Sign In")');

  // Wait for navigation to dashboard
  await page.waitForURL(/dashboard|home/, { timeout: 10000 });
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button (could be in header, menu, or settings)
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log Out"), button:has-text("Sign Out")');
  await logoutButton.click();

  // Wait for redirect to login page
  await page.waitForURL(/login|^\/$/, { timeout: 5000 });
}

/**
 * Check if user is logged in (should be on dashboard)
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('dashboard') || url.includes('home');
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
 * Mock API responses for testing
 */
export async function mockApiResponses(page: Page, scenarios: {
  login?: boolean;
  children?: typeof MOCK_CHILDREN;
  alerts?: any[];
  liveLocation?: any;
}): Promise<void> {
  // Intercept API calls and return mock data
  await page.route('**/api/v1/parent/login', async (route) => {
    if (scenarios.login === false) {
      await route.fulfill({
        status: 401,
        json: { message: 'Invalid credentials' },
      });
    } else {
      await route.fulfill({
        status: 200,
        json: {
          user: TEST_USERS.PARENT,
          token: 'mock-jwt-token',
        },
      });
    }
  });

  if (scenarios.children) {
    await page.route('**/api/v1/parent/children', async (route) => {
      await route.fulfill({
        status: 200,
        json: scenarios.children,
      });
    });
  }

  if (scenarios.alerts !== undefined) {
    await page.route('**/api/v1/parent/alerts/*', async (route) => {
      await route.fulfill({
        status: 200,
        json: scenarios.alerts,
      });
    });
  }

  if (scenarios.liveLocation) {
    await page.route('**/api/v1/parent/routes/*/live-location', async (route) => {
      await route.fulfill({
        status: 200,
        json: scenarios.liveLocation,
      });
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
    [JSON.stringify(user), 'mock-jwt-token']
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
