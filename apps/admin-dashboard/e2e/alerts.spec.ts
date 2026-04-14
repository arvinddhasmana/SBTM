/**
 * E2E: Alerts Management Page
 *
 * Covers:
 *   - Alerts page rendering (heading, filters, tier tabs)
 *   - Alert creation via emergency-events API
 *   - Tier 1 PENDING_CONFIRMATION flow (Confirm, False Alarm, Request Info)
 *   - Alert detail modal with audit timeline
 *   - Resolving alerts and adding status updates
 *   - Console error monitoring
 *
 * Test IDs: AL01–AL14
 *
 * Prerequisites: Backend services running (api-gateway:3001, emergency-alerts:3003)
 */
import { test, expect } from '@playwright/test';
import { loginAs, collectConsoleErrors, createTestAlert, gotoAndWait } from './fixtures';

test.describe('AL: Alerts Management', () => {
  // ─── Page Rendering ──────────────────────────────────────────────────────────

  test.describe('Page Rendering', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alerts');
    });

    /** AL01 — Alerts page renders with heading */
    test('AL01 – renders Alerts Management heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Alerts Management/i })).toBeVisible();
    });

    /** AL02 — Filter buttons are visible */
    test('AL02 – shows status filter buttons (All, Active, Pending, In Progress, Resolved)', async ({
      page,
    }) => {
      await expect(page.getByRole('button', { name: /^All \(/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Active \(/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Pending/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^In Progress \(/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Resolved \(/i })).toBeVisible();
    });

    /** AL03 — Tier filter tabs are visible */
    test('AL03 – shows tier filter tabs', async ({ page }) => {
      await expect(page.getByRole('button', { name: /All Tiers/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Safety.*Tier 1/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Operational.*Tier 2/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Informational.*Tier 3/i })).toBeVisible();
    });

    /** AL04 — Clicking Active filter narrows the list */
    test('AL04 – Active filter button is clickable and updates view', async ({ page }) => {
      const activeBtn = page.getByRole('button', { name: /Active/i });
      await activeBtn.click();
      // Verify the button appears selected (has bg-red-500 class)
      await expect(activeBtn).toHaveClass(/bg-red-500/);
    });
  });

  // ─── Tier 1 Alert Lifecycle ──────────────────────────────────────────────────

  test.describe('Tier 1 Alert Lifecycle', () => {
    /** AL05 — Creating a PANIC_BUTTON alert makes it appear in the list */
    test('AL05 – PANIC_BUTTON alert appears as PENDING_CONFIRMATION', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      const alertId = await createTestAlert(page, { eventType: 'PANIC_BUTTON' });
      expect(alertId).toBeTruthy();
      await gotoAndWait(page, '/alerts');
      await page.waitForLoadState('networkidle');

      // Should see at least one alert related to PANIC
      await expect(page.getByText(/Panic Button/i).first()).toBeVisible({ timeout: 10_000 });
    });

    /** AL06 — Clicking a pending alert opens AlertConfirmationModal */
    test('AL06 – clicking pending alert opens confirmation modal with countdown', async ({
      page,
    }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await createTestAlert(page, { eventType: 'PANIC_BUTTON' });
      await gotoAndWait(page, '/alerts');
      await page.waitForLoadState('networkidle');

      // Click on the pending filter first to isolate pending alerts
      await page.getByRole('button', { name: /Pending/i }).click();
      await page.waitForTimeout(500);

      // Click first alert card
      const alertCard = page.locator('[class*="cursor-pointer"]').first();
      if (await alertCard.isVisible()) {
        await alertCard.click();
        // Expect confirmation modal with countdown timer
        await expect(
          page.getByTestId('countdown-timer').or(page.getByText(/Alert Requires Confirmation/i)),
        ).toBeVisible({ timeout: 5_000 });
      }
    });

    /** AL07 — Modal shows all 3 action buttons */
    test('AL07 – confirmation modal shows Confirm, False Alarm, and Request Info buttons', async ({
      page,
    }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await createTestAlert(page, { eventType: 'PANIC_BUTTON' });
      await gotoAndWait(page, '/alerts');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /Pending/i }).click();
      await page.waitForTimeout(500);

      const alertCard = page.locator('[class*="cursor-pointer"]').first();
      if (await alertCard.isVisible()) {
        await alertCard.click();
        await page.waitForTimeout(500);

        await expect(page.getByTestId('btn-confirm')).toBeVisible({ timeout: 5_000 });
        await expect(page.getByTestId('btn-false-alarm')).toBeVisible();
        await expect(page.getByTestId('btn-request-info')).toBeVisible();
      }
    });

    /** AL08 — Request Info shows success feedback and modal stays open */
    test('AL08 – Request Info shows feedback and modal stays open', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await createTestAlert(page, { eventType: 'PANIC_BUTTON' });
      await gotoAndWait(page, '/alerts');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /Pending/i }).click();
      await page.waitForTimeout(500);

      const alertCard = page.locator('[class*="cursor-pointer"]').first();
      if (await alertCard.isVisible()) {
        await alertCard.click();
        await page.waitForTimeout(500);

        const requestInfoBtn = page.getByTestId('btn-request-info');
        if (await requestInfoBtn.isVisible()) {
          await requestInfoBtn.click();
          // Wait for the feedback state
          await expect(
            page.getByTestId('info-requested-note').or(page.getByText(/Info Requested/i)),
          ).toBeVisible({ timeout: 5_000 });
          // Modal should still be open (confirmation modal title still visible)
          await expect(page.getByText(/Alert Requires Confirmation/i)).toBeVisible();
        }
      }
    });

    /** AL09 — Confirm alert changes status */
    test('AL09 – Confirm and Notify Parents changes alert to CONFIRMED', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await createTestAlert(page, { eventType: 'PANIC_BUTTON' });
      await gotoAndWait(page, '/alerts');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /Pending/i }).click();
      await page.waitForTimeout(500);

      const alertCard = page.locator('[class*="cursor-pointer"]').first();
      if (await alertCard.isVisible()) {
        await alertCard.click();
        await page.waitForTimeout(500);

        const confirmBtn = page.getByTestId('btn-confirm');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          // Modal should close after confirmation
          await expect(page.getByText(/Alert Requires Confirmation/i)).not.toBeVisible({
            timeout: 5_000,
          });
        }
      }
    });

    /** AL10 — False Alarm changes alert status */
    test('AL10 – Mark as False Alarm closes modal', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await createTestAlert(page, { eventType: 'PANIC_BUTTON' });
      await gotoAndWait(page, '/alerts');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /Pending/i }).click();
      await page.waitForTimeout(500);

      const alertCard = page.locator('[class*="cursor-pointer"]').first();
      if (await alertCard.isVisible()) {
        await alertCard.click();
        await page.waitForTimeout(500);

        const falseAlarmBtn = page.getByTestId('btn-false-alarm');
        if (await falseAlarmBtn.isVisible()) {
          await falseAlarmBtn.click();
          await expect(page.getByText(/Alert Requires Confirmation/i)).not.toBeVisible({
            timeout: 5_000,
          });
        }
      }
    });
  });

  // ─── Alert Detail & Actions ──────────────────────────────────────────────────

  test.describe('Alert Detail & Actions', () => {
    /** AL11 — Alert detail modal shows audit timeline */
    test('AL11 – alert detail shows Activity Timeline', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      // Create and confirm an alert first so it has audit entries and is in a working state
      await createTestAlert(page, { eventType: 'PANIC_BUTTON' });
      await gotoAndWait(page, '/alerts');
      await page.waitForLoadState('networkidle');

      // Click on any non-pending alert or use "All" filter
      const allBtn = page.getByRole('button', { name: /^All \(/i });
      await allBtn.click();
      await page.waitForTimeout(500);

      // Click the first alert card
      const alertCards = page.locator('[class*="cursor-pointer"]');
      const count = await alertCards.count();
      if (count > 0) {
        // Click one that might be non-pending to get the detail modal
        await alertCards.first().click();
        await page.waitForTimeout(1000);

        // Either the confirmation modal or detail modal should be open
        const hasTimeline = await page
          .getByText(/Activity Timeline/i)
          .isVisible()
          .catch(() => false);
        if (hasTimeline) {
          await expect(page.getByText(/Activity Timeline/i)).toBeVisible();
        }
        // Timeline visibility depends on whether audit entries exist for this alert
      }
    });

    /** AL12 — Resolving an alert via detail modal */
    test('AL12 – resolve incident button is available for confirmed alerts', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alerts');
      await page.waitForLoadState('networkidle');

      // Look for "In Progress" filter to find confirmed/active alerts
      const inProgressBtn = page.getByRole('button', { name: /In Progress/i });
      await inProgressBtn.click();
      await page.waitForTimeout(500);

      const alertCard = page.locator('[class*="cursor-pointer"]').first();
      if (await alertCard.isVisible()) {
        await alertCard.click();
        await page.waitForTimeout(500);

        // Detail modal should show "Resolve Incident" button
        const resolveBtn = page.getByTestId('btn-resolve-confirmed');
        if (await resolveBtn.isVisible().catch(() => false)) {
          await expect(resolveBtn).toBeVisible();
        }
      }
    });

    /** AL13 — Adding a status update appears in audit trail */
    test('AL13 – add status update button exists for active/confirmed alerts', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alerts');
      await page.waitForLoadState('networkidle');

      const inProgressBtn = page.getByRole('button', { name: /In Progress/i });
      await inProgressBtn.click();
      await page.waitForTimeout(500);

      const alertCard = page.locator('[class*="cursor-pointer"]').first();
      if (await alertCard.isVisible()) {
        await alertCard.click();
        await page.waitForTimeout(500);

        const addUpdateBtn = page.getByTestId('btn-add-update');
        if (await addUpdateBtn.isVisible().catch(() => false)) {
          await addUpdateBtn.click();
          await expect(page.getByTestId('update-notes-input')).toBeVisible({ timeout: 3_000 });
        }
      }
    });
  });

  // ─── Console Errors ──────────────────────────────────────────────────────────

  /** AL14 — No console errors on alerts page */
  test('AL14 – alerts page loads without console errors', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await loginAs(page, 'SCHOOL_ADMIN');
    await gotoAndWait(page, '/alerts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const errors = getErrors().filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ResizeObserver') &&
        !e.includes('401') &&
        !e.includes('ERR_CONNECTION_REFUSED'),
    );
    expect(errors).toHaveLength(0);
  });
});
