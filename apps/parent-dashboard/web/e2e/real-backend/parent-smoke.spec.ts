/**
 * Real-backend smoke tests — NO network mocking.
 *
 * These tests hit the actual api-gateway and dependent services. They must
 * only run in the test:e2e:real CI step with the full stack up. They catch
 * the class of failure identified in e2e-gap-analysis.md where the mocked
 * E2E suite passed while the real backend was broken:
 *
 * - Gap 1: parent portal GET /parent/children returned 502 (bad column name)
 * - Gap 4: stx_students entity columns out of sync with v2 schema
 *
 * Seed account: parent1.stbern@sbtm.demo / Admin123!
 * (created by db/seeds/demo-users.sql)
 */
import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3001';
const PARENT_EMAIL = process.env.E2E_PARENT_EMAIL ?? 'parent1.stbern@sbtm.demo';
const PARENT_PASSWORD = process.env.E2E_PARENT_PASSWORD ?? 'Admin123!';

test.describe('Real-backend smoke — Parent Portal', () => {
  test('login → /parent/children returns data', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[id="email"]').fill(PARENT_EMAIL);
    await page.locator('input[id="password"]').fill(PARENT_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page.locator('[data-testid="child-card"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('authenticated /parent/children API call succeeds (no 4xx/5xx)', async ({ page }) => {
    // Login via form to get a real JWT
    await page.goto('/login');
    await page.locator('input[id="email"]').fill(PARENT_EMAIL);
    await page.locator('input[id="password"]').fill(PARENT_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();

    const res = await page.request.get(`${API_URL}/api/v1/parent/children`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /auth/me returns authenticated user after login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[id="email"]').fill(PARENT_EMAIL);
    await page.locator('input[id="password"]').fill(PARENT_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const res = await page.request.get(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBe(true);
    const me = await res.json();
    expect(me.role).toBe('PARENT');
  });
});
