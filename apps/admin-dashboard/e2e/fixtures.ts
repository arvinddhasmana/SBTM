import { type Page } from '@playwright/test';

const E2E_API_URL = process.env.E2E_API_URL ?? 'http://localhost:3001';

/**
 * Passwords for admin test users (all share the same password in the demo seed).
 * Used by loginAs to perform a real backend login and obtain the access_token cookie.
 */
const ADMIN_PASSWORDS: Partial<Record<string, string>> = {
  SUPER_ADMIN: 'Admin123!',
  STA_ADMIN: 'Admin123!',
  BOARD_ADMIN: 'Admin123!',
  SCHOOL_ADMIN: 'Admin123!',
};

/**
 * Seed user data matching the `auth_user` localStorage format expected by AuthContext.
 * IDs and school/boardIds match the 6-school demo seed (scripts/seed-standard.sql + scripts/seed-demo.sql).
 */
export const TEST_USERS = {
  SUPER_ADMIN: {
    id: '10000000-0000-0000-0000-000000000000',
    email: 'super.admin@sbtm.demo',
    role: 'SUPER_ADMIN',
    name: 'Super Admin',
    schoolId: null,
    boardId: null,
  },
  STA_ADMIN: {
    id: '10000000-0000-0000-0000-000000000001',
    email: 'sta.admin@sbtm.demo',
    role: 'STA_ADMIN',
    name: 'STA Admin',
    schoolId: null,
    boardId: null,
  },
  BOARD_ADMIN: {
    id: '10000000-0000-0000-0000-000000000003',
    email: 'ocdsb.admin@sbtm.demo',
    role: 'BOARD_ADMIN',
    name: 'OCDSB Admin',
    schoolId: null,
    boardId: 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
  },
  SCHOOL_ADMIN: {
    id: '30000000-0000-0000-0001-00000000000a',
    email: 'admin.stbern@sbtm.demo',
    role: 'SCHOOL_ADMIN',
    name: 'Admin St.',
    schoolId: '30000000-0000-0000-0001-000000000001',
    boardId: 'b1a2b3c4-d5e6-4f7a-8b9c-1d2e3f4a5b6c',
  },
  DRIVER: {
    id: '30000000-0000-0000-0001-00000000000d',
    email: 'driver.stbern@sbtm.demo',
    role: 'DRIVER',
    name: 'Driver St.',
    schoolId: '30000000-0000-0000-0001-000000000001',
    boardId: null,
  },
  PARENT: {
    id: '30000000-0000-0001-0000-000000000001',
    email: 'parent1.stbern@sbtm.demo',
    role: 'PARENT',
    name: 'Michael Anderson',
    schoolId: null,
    boardId: null,
  },
} as const;

export type TestRole = keyof typeof TEST_USERS;

export const ADMIN_ROLES: TestRole[] = ['SUPER_ADMIN', 'STA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN'];

/**
 * Common nav items visible to ALL admin roles.
 * Matches Sidebar.tsx allowedRoles: ALL_ADMIN_ROLES.
 */
export const COMMON_NAV_ITEMS = [
  'Dashboard',
  'Alerts',
  'Operational',
  'Routes',
  'Planner',
  'Compliance',
  'Assignments',
  'Students',
  'Absences',
  'Settings',
] as const;

/**
 * Inject an admin user into localStorage and navigate to /dashboard.
 * Bypasses the login form — use this for page/content tests, not auth flow tests.
 *
 * Strategy:
 *   1. Navigate to /login (ensures localStorage is writable for this origin)
 *   2. Perform a real POST /api/v1/auth/login so the backend sets the access_token
 *      cookie in the browser context.  Without this cookie, every authenticated API
 *      call returns 401 and the api-client interceptor fires window.location=/login,
 *      which would navigate away from the dashboard during the test.
 *   3. Inject the user session into localStorage (AuthContext reads this on init).
 *   4. Navigate to /dashboard with waitUntil:'load' — this waits for React to fully
 *      bootstrap (all Vite modules downloaded + executed). With auth in localStorage
 *      AND a valid cookie, ProtectedRoute renders the dashboard and API calls succeed.
 *
 * In a fresh browser context (no module cache) the Vite dev-server may take several
 * seconds to serve all ES modules.  'load' ensures we don't race React's hydration.
 */
export async function loginAs(page: Page, role: TestRole): Promise<void> {
  // Navigate first — localStorage is inaccessible on about:blank
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  // Obtain a real access_token cookie so backend API calls are authorised.
  const password = ADMIN_PASSWORDS[role];
  if (password) {
    const loginRes = await page.request.post(`${E2E_API_URL}/api/v1/auth/login`, {
      data: { email: TEST_USERS[role].email, password },
    });
    // Also store the Bearer token so the api-client's Bearer fallback works.
    // Without this, API calls fail with 401 when the cookie is not forwarded
    // by the Vite proxy (cross-port cookie scope), which triggers the 401
    // interceptor to clear localStorage and redirect to /login mid-test.
    let body: Record<string, unknown>;
    try {
      body = (await loginRes.json()) as Record<string, unknown>;
    } catch (err) {
      throw new Error(
        `loginAs(${role}): could not parse login response (status ${loginRes.status()}): ${err}`,
      );
    }
    if (!loginRes.ok()) {
      throw new Error(`loginAs(${role}) failed: ${loginRes.status()} ${JSON.stringify(body)}`);
    }
    if (body.accessToken) {
      await page.evaluate(
        (token) => localStorage.setItem('auth_token', token),
        body.accessToken as string,
      );
    }
    // Prefer the real user object from the backend (has anchorKind/anchorId needed
    // by role-scoped hooks); fall back to the static fixture if absent.
    const realUser = body.user as Record<string, unknown> | undefined;
    if (realUser) {
      await page.evaluate(
        (user) => localStorage.setItem('auth_user', JSON.stringify(user)),
        realUser,
      );
      await page.goto('/dashboard', { waitUntil: 'load' }).catch(() => {});
      return;
    }
  }

  // Store the local user state used by AuthContext to set isAuthenticated.
  await page.evaluate(
    (user) => localStorage.setItem('auth_user', JSON.stringify(user)),
    TEST_USERS[role],
  );
  // 'load' fires after all scripts execute (React runs, stays on /dashboard).
  // .catch() absorbs any ERR_ABORTED from an in-flight redirect on the previous page.
  await page.goto('/dashboard', { waitUntil: 'load' }).catch(() => {});
}

/**
 * Navigate to a URL within the SPA, tolerating React Router client-side redirects.
 *
 * React Router v7 performs redirects (via pushState/replaceState) before the 'load'
 * event fires. Playwright's page.goto() waits for 'load' by default and treats the
 * pre-load redirect as ERR_ABORTED. This helper:
 *   1. Uses domcontentloaded to avoid the aborted-load issue
 *   2. Swallows any navigation error (the URL is verified by the test assertion)
 *   3. Waits a fixed ms for React Router to settle on the final URL
 */
export async function gotoAndWait(page: Page, url: string, waitMs = 600): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {
    /* redirect abort — URL is checked by the test */
  });
  await page.waitForTimeout(waitMs);
}

/**
 * Inject a non-admin user (DRIVER or PARENT) into localStorage then reload.
 * AuthContext detects the disallowed role, clears localStorage, and redirects to /login.
 */
export async function injectNonAdminSession(page: Page, role: 'DRIVER' | 'PARENT'): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (user) => localStorage.setItem('auth_user', JSON.stringify(user)),
    TEST_USERS[role],
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
}

/** Clear all auth state. */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.removeItem('auth_user'));
}

/**
 * Seed a ROUTE_STARTED lifecycle event for a route so it appears as active on the dashboard.
 * Uses the driver user's credentials. If the event already exists, the POST may fail silently.
 */
export async function startRouteForE2E(
  page: Page,
  routeId: string,
  vehicleId: string,
): Promise<void> {
  // Use SUPER_ADMIN — DRIVER anchor check ('driver' kind) blocks the driver user
  const loginRes = await page.request.post(`${E2E_API_URL}/api/v1/auth/login`, {
    data: { email: TEST_USERS.SUPER_ADMIN.email, password: 'Admin123!' },
  });
  let token: string | undefined;
  try {
    const body = await loginRes.json();
    token = body.accessToken;
  } catch {
    /* ignore */
  }

  if (token) {
    await page.request
      .post(`${E2E_API_URL}/api/v1/routes/lifecycle-events`, {
        data: {
          routeId,
          vehicleId,
          eventType: 'ROUTE_STARTED',
          timestamp: new Date().toISOString(),
        },
        headers: { Authorization: `Bearer ${token}` },
      })
      .catch(() => {
        /* non-critical */
      });
  }
}

/**
 * Verify that the current browser session has a valid, accepted JWT by calling
 * GET /auth/me. Throws if the response is not 2xx.
 *
 * Usage: call after loginAs() in test.beforeEach for data-dependent tests.
 * This catches the failure mode where loginAs() injected hardcoded localStorage
 * but the real backend did not authenticate (e.g. user not in DB, wrong password).
 */
export async function assertSessionValid(page: Page): Promise<void> {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  if (!token) {
    throw new Error('assertSessionValid: no auth_token in localStorage after loginAs()');
  }
  const res = await page.request.get(`${E2E_API_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(
      `assertSessionValid: GET /auth/me returned ${res.status()} — session is not valid`,
    );
  }
}

/**
 * Collect console errors on the page at or above the 'error' level.
 * Call at the start of a test; harvest errors at the end.
 */
export function collectConsoleErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return () => errors;
}

/**
 * Create a test alert by POSTing an emergency event as the DRIVER user.
 * Returns the alertId from the response. Requires the backend to be running.
 */
export async function createTestAlert(
  _page: Page,
  options: { eventType?: string; routeId?: string; vehicleId?: string } = {},
): Promise<string | undefined> {
  const token = await getDriverToken();
  if (!token) return undefined;

  const res = await fetch(`${E2E_API_URL}/api/v1/emergency-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      vehicleId: options.vehicleId || 'BUS-STBERN-01',
      routeId: options.routeId || 'R-OCSB-201',
      eventType: options.eventType || 'PANIC_BUTTON',
      timestamp: new Date().toISOString(),
      lat: 45.3506,
      lng: -75.7934,
    }),
  }).catch(() => null);

  if (!res) return undefined;
  try {
    const body = (await res.json()) as { alertId?: string };
    return body.alertId;
  } catch {
    return undefined;
  }
}

/**
 * Send a GPS location update for a vehicle on a route.
 * Uses the DRIVER user's credentials to authenticate.
 * Returns true if the request succeeded.
 */
export async function sendGpsLocation(
  _page: Page,
  options: {
    routeId?: string;
    vehicleId?: string;
    lat?: number;
    lng?: number;
    speedKph?: number;
  } = {},
): Promise<boolean> {
  const token = await getDriverToken();
  if (!token) return false;

  const res = await fetch(`${E2E_API_URL}/api/v1/routes/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      vehicleId: options.vehicleId || 'BUS-STBERN-01',
      routeId: options.routeId || 'R-OCSB-201',
      timestamp: new Date().toISOString(),
      lat: options.lat ?? 45.3506,
      lng: options.lng ?? -75.7934,
      speedKph: options.speedKph ?? 30,
    }),
  }).catch(() => null);

  return res?.ok ?? false;
}

/**
 * Complete a route by posting a ROUTE_COMPLETED lifecycle event.
 * Uses the DRIVER user's credentials.
 */
export async function completeRouteForE2E(
  _page: Page,
  routeId: string,
  vehicleId: string,
): Promise<void> {
  const token = await getDriverToken();
  if (token) {
    await fetch(`${E2E_API_URL}/api/v1/routes/lifecycle-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        routeId,
        vehicleId,
        eventType: 'ROUTE_COMPLETED',
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      /* non-critical */
    });
  }
}

/** Internal helper: obtain a driver JWT token using Node.js fetch (isolated from browser cookies). */
async function getDriverToken(): Promise<string | undefined> {
  const res = await fetch(`${E2E_API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_USERS.DRIVER.email, password: 'Admin123!' }),
  }).catch(() => null);
  if (!res) return undefined;
  try {
    const body = (await res.json()) as { accessToken?: string };
    return body.accessToken;
  } catch {
    return undefined;
  }
}
