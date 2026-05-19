/**
 * E2E: Notifications (Alert History) — Parent Dashboard Web
 *
 * Covers empty state, alert card rendering, timeline expand/collapse.
 *
 * Test IDs: WPD-NOTIF01–WPD-NOTIF10
 */
import {
  test,
  expect,
  MOCK_CHILDREN,
  MOCK_ALERT_HISTORY,
  MOCK_AUDIT_TRAIL,
  mockApiRoutes,
  injectSession,
} from './fixtures';

test.describe('Notifications – Parent Dashboard Web', () => {
  async function goToNotifications(page: any, alertHistory = MOCK_ALERT_HISTORY) {
    await mockApiRoutes(page, {
      children: MOCK_CHILDREN,
      alertHistory,
      auditTrail: MOCK_AUDIT_TRAIL,
    });
    await page.goto('/login');
    await injectSession(page);
    await page.goto('/notifications');
    await page.waitForURL('**/notifications');
    await page.waitForTimeout(800);
  }

  test('WPD-NOTIF01: renders "Alert History" heading', async ({ page }) => {
    await goToNotifications(page);
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-NOTIF02: shows empty state when no alerts', async ({ page }) => {
    await goToNotifications(page, []);
    await expect(page.locator('[class*="ShieldAlert"], svg').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('WPD-NOTIF03: renders an alert card for each history record', async ({ page }) => {
    await goToNotifications(page);
    const cards = page.locator('.glass-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(MOCK_ALERT_HISTORY.length);
  });

  test('WPD-NOTIF04: alert card shows event type badge', async ({ page }) => {
    await goToNotifications(page);
    await expect(page.locator('text=/LATE.ARRIVAL/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-NOTIF05: alert card shows status badge', async ({ page }) => {
    await goToNotifications(page);
    await expect(page.locator('text=/RESOLVED/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-NOTIF06: "View Timeline" button is present on alert card', async ({ page }) => {
    await goToNotifications(page);
    const timelineBtn = page.getByText(/view timeline/i).first();
    await expect(timelineBtn).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-NOTIF07: clicking "View Timeline" expands the timeline', async ({ page }) => {
    await goToNotifications(page);
    const timelineBtn = page.getByText(/view timeline/i).first();
    await timelineBtn.click();
    await page.waitForTimeout(600);
    // After expand, the hide/collapse text appears
    await expect(page.getByText(/hide timeline/i)).toBeVisible({ timeout: 8_000 });
  });

  test('WPD-NOTIF08: expanded timeline shows audit events', async ({ page }) => {
    await goToNotifications(page);
    const timelineBtn = page.getByText(/view timeline/i).first();
    await timelineBtn.click();
    await page.waitForTimeout(600);
    // Should show CONFIRMED or RESOLVED event from mock audit trail
    await expect(page.locator('text=/CONFIRMED|RESOLVED/i').first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test('WPD-NOTIF09: clicking "Hide Timeline" collapses it', async ({ page }) => {
    await goToNotifications(page);
    await page
      .getByText(/view timeline/i)
      .first()
      .click();
    await page.waitForTimeout(400);
    await page
      .getByText(/hide timeline/i)
      .first()
      .click();
    await page.waitForTimeout(400);
    // Now the timeline is hidden, view button reappears
    await expect(page.getByText(/view timeline/i)).toBeVisible({ timeout: 5_000 });
  });

  test('WPD-NOTIF10: refresh button is visible', async ({ page }) => {
    await goToNotifications(page);
    const refreshBtn = page.locator('button[aria-label]').filter({ hasText: /refresh/i });
    await expect(refreshBtn).toBeVisible({ timeout: 10_000 });
  });
});
