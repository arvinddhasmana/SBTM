/**
 * E2E: Data-page assertions — routes and vehicles
 *
 * These tests cover the failure modes identified in e2e-gap-analysis.md:
 * - Gap 6: RouteCard crashed on route.stops.length when stops was undefined
 * - Gap 6: formatEta rendered "NaN min" when ETA was unavailable
 * - Gap 2: Admin portal did not assert on actual data pages for SUPER_ADMIN
 *
 * Each test calls assertSessionValid() to catch the "valid session but broken
 * data endpoint" scenario that the old loginAs fixture could not detect.
 *
 * Test IDs: DP01–DP06
 */
import { test, expect } from '@playwright/test';
import { loginAs, assertSessionValid, collectConsoleErrors } from './fixtures';

const E2E_API_URL = process.env.E2E_API_URL ?? 'http://localhost:3001';

test.describe('Data-page regression — Routes', () => {
  test('DP01: SUPER_ADMIN /routes renders without TypeError (stops crash)', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, 'SUPER_ADMIN');
    await assertSessionValid(page);

    await page.goto('/routes', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // No TypeError from route.stops.length — this was the crash in RouteCard.tsx
    const stopsCrash = errors().filter((e) =>
      e.includes("Cannot read properties of undefined (reading 'length')"),
    );
    expect(stopsCrash).toHaveLength(0);

    // No "NaN min" in any visible text (formatEta fix)
    const nanText = await page.locator('text=NaN min').count();
    expect(nanText).toBe(0);
  });

  test('DP02: routes API returns 2xx for SUPER_ADMIN', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await assertSessionValid(page);

    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const res = await page.request.get(`${E2E_API_URL}/api/v1/routes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    // Each route should have a stops array (not undefined)
    for (const route of body as Record<string, unknown>[]) {
      expect(Array.isArray(route.stops)).toBe(true);
    }
  });

  test('DP03: BOARD_ADMIN /routes renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, 'BOARD_ADMIN');
    await assertSessionValid(page);

    await page.goto('/routes', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const stopsCrash = errors().filter((e) =>
      e.includes("Cannot read properties of undefined (reading 'length')"),
    );
    expect(stopsCrash).toHaveLength(0);
  });
});

test.describe('Data-page regression — Vehicles (Fleet)', () => {
  test('DP04: SUPER_ADMIN can access fleet/vehicles endpoint (no 403)', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await assertSessionValid(page);

    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const res = await page.request.get(`${E2E_API_URL}/api/v1/fleet/vehicles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Must not be 403 — SUPER_ADMIN should see all vehicles without operatorId scope
    expect(res.status()).not.toBe(403);
    expect(res.ok()).toBe(true);
  });

  test('DP05: STA_ADMIN can access fleet/vehicles endpoint (no 403)', async ({ page }) => {
    await loginAs(page, 'STA_ADMIN');
    await assertSessionValid(page);

    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const res = await page.request.get(`${E2E_API_URL}/api/v1/fleet/vehicles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).not.toBe(403);
    expect(res.ok()).toBe(true);
  });
});

test.describe('Data-page regression — Absences (SUPER_ADMIN 403 regression)', () => {
  test('DP06: SUPER_ADMIN /absences API returns 2xx, not 403', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await assertSessionValid(page);

    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    // This was the specific endpoint that returned 403 before the P1 fix
    const res = await page.request.get(`${E2E_API_URL}/api/v1/absences/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).not.toBe(403);
    expect(res.ok()).toBe(true);
  });
});
