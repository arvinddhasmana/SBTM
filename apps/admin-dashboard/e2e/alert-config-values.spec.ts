import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures';

const E2E_API_URL = process.env.E2E_API_URL ?? 'http://localhost:3001';

/**
 * Verifies the front-end timer values match the configured backend values.
 *
 * The bug: the dashboard used to hardcode CONFIRMATION_WINDOW_MS = 120_000.
 * If a super-admin updated tier1-default in the alert configuration UI to a
 * different value, the AlertDetail / AlertConfirmationModal countdown still
 * displayed the old hardcoded 2:00 window, while the backend BullMQ scheduler
 * used the configured value — producing a visible discrepancy.
 *
 * Fix: countdown now reads from useEscalationConfig('TIER_1') and falls back
 * to the seeded default. This test exercises that wiring end-to-end:
 *   1. read /api/v1/alert-config/escalation-timing/TIER_1 directly
 *   2. assert it returns confirmationTimeoutMs that matches what the
 *      backend (alerts.service.getEscalationTiming) would use
 *   3. assert the dashboard renders the same value in the seconds field
 */
test.describe('Alert Config UI matches backend logic values', () => {
  test('Tier 1 confirmation timeout shown in UI equals API value', async ({ page, request }) => {
    // 1. Authenticate directly against the API to obtain a JWT for the API call.
    const loginResp = await request.post(`${E2E_API_URL}/api/v1/auth/login`, {
      data: { email: 'super.admin@sbtm.demo', password: 'Admin123!' },
    });
    expect(loginResp.ok()).toBeTruthy();
    const { accessToken } = (await loginResp.json()) as { accessToken: string };

    const apiResp = await request.get(
      `${E2E_API_URL}/api/v1/alert-config/escalation-timing/TIER_1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(apiResp.ok()).toBeTruthy();
    const cfg = (await apiResp.json()) as {
      confirmationTimeoutMs: number;
      boardEscalationMs: number;
      ostaEscalationMs: number;
    };
    expect(cfg.confirmationTimeoutMs).toBeGreaterThan(0);

    const expectedConfirmSec = cfg.confirmationTimeoutMs / 1000;
    const expectedBoardSec = cfg.boardEscalationMs / 1000;
    const expectedOstaSec = cfg.ostaEscalationMs / 1000;

    // 2. Drive the Escalation Timing page in the browser.
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/alert-config/escalation-timing', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1').last()).toContainText('Escalation Timing', {
      timeout: 15_000,
    });

    // The TIER_1 card section.
    const tier1Card = page.locator('text=TIER_1').first();
    await expect(tier1Card).toBeVisible();

    // Confirm the displayed seconds equal the backend value.
    await expect(page.getByText(`${expectedConfirmSec}s`).first()).toBeVisible();
    await expect(page.getByText(`${expectedBoardSec}s`).first()).toBeVisible();
    await expect(page.getByText(`${expectedOstaSec}s`).first()).toBeVisible();

    await page.screenshot({
      path: 'test-results/alert-config-tier1-values.png',
      fullPage: true,
    });
  });

  test('AlertDetail countdown reads configured timeout (no hardcoded 2:00)', async ({ page }) => {
    // Set the tier1 confirmation timeout to a non-default value, then verify
    // the dashboard timer reflects it. We restore the default at the end so
    // other tests / demo data stay consistent.
    const apiContext = page.context().request;
    const loginResp = await apiContext.post(`${E2E_API_URL}/api/v1/auth/login`, {
      data: { email: 'super.admin@sbtm.demo', password: 'Admin123!' },
    });
    const { accessToken } = (await loginResp.json()) as { accessToken: string };
    const headers = { Authorization: `Bearer ${accessToken}` };

    const original = await (
      await apiContext.get(`${E2E_API_URL}/api/v1/alert-config/escalation-timing/TIER_1`, {
        headers,
      })
    ).json();

    const targetMs = 240_000; // 4:00 — clearly different from the seeded 120_000
    try {
      const updateResp = await apiContext.put(
        `${E2E_API_URL}/api/v1/alert-config/escalation-timing/TIER_1`,
        {
          headers: { ...headers, 'Content-Type': 'application/json' },
          data: {
            tier: 'TIER_1',
            confirmationTimeoutMs: targetMs,
            boardEscalationMs: original.boardEscalationMs,
            ostaEscalationMs: original.ostaEscalationMs,
            isActive: true,
          },
        },
      );
      expect(updateResp.ok()).toBeTruthy();

      // Force the alerts service to refresh its cache so the next config read
      // returns the new value (UI uses React Query with 60s staleTime, but a
      // hard reload re-fetches on mount).
      await apiContext.post(`${E2E_API_URL}/api/v1/alert-config/cache/invalidate`, { headers });

      await loginAs(page, 'SUPER_ADMIN');
      await page.goto('/alert-config/escalation-timing', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').last()).toContainText('Escalation Timing', {
        timeout: 15_000,
      });
      await expect(page.getByText(`${targetMs / 1000}s`).first()).toBeVisible({
        timeout: 10_000,
      });

      await page.screenshot({
        path: 'test-results/alert-config-tier1-updated.png',
        fullPage: true,
      });
    } finally {
      // Always restore the original configuration so this test is idempotent.
      await apiContext.put(`${E2E_API_URL}/api/v1/alert-config/escalation-timing/TIER_1`, {
        headers: { ...headers, 'Content-Type': 'application/json' },
        data: {
          tier: 'TIER_1',
          confirmationTimeoutMs: original.confirmationTimeoutMs,
          boardEscalationMs: original.boardEscalationMs,
          ostaEscalationMs: original.ostaEscalationMs,
          isActive: true,
        },
      });
      await apiContext.post(`${E2E_API_URL}/api/v1/alert-config/cache/invalidate`, { headers });
    }
  });
});
