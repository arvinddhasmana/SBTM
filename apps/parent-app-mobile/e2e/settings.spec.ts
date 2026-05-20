/**
 * E2E: Settings Screen — Parent Mobile App (Expo Web)
 *
 * Verifies notification preference cards render, EMERGENCY locked state,
 * channel toggles, save button, and the success banner.
 *
 * Test IDs: PA-SET01–PA-SET10
 */
import { test, expect } from '@playwright/test';
import { loginAs, mockApiResponses, TEST_USERS, MOCK_CHILDREN } from './fixtures';

const MOCK_PREFS = [
  { eventType: 'BOARD', channel: 'PUSH', enabled: true },
  { eventType: 'BOARD', channel: 'EMAIL', enabled: false },
  { eventType: 'ALIGHT', channel: 'PUSH', enabled: true },
  { eventType: 'ALIGHT', channel: 'EMAIL', enabled: false },
  { eventType: 'EMERGENCY', channel: 'PUSH', enabled: true },
  { eventType: 'EMERGENCY', channel: 'EMAIL', enabled: true },
];

const FULL_CHILDREN = MOCK_CHILDREN.map((c) => ({
  ...c,
  schoolName: c.school,
  schoolId: 'school-1',
  amRouteId: c.routeId,
  pmRouteId: c.routeId,
  amRouteName: 'Morning Loop',
  pmRouteName: 'Afternoon Loop',
  amStopId: 'stop-1',
  stopName: 'Maple & 5th',
  vehicleId: 'BUS-101',
  name: `${c.firstName} ${c.lastName}`,
}));

async function setupAndNavigate(page: any) {
  await mockApiResponses(page, {
    login: true,
    children: FULL_CHILDREN,
    alerts: [],
    alertHistory: [],
    notificationPreferences: MOCK_PREFS,
  });
  await loginAs(page, TEST_USERS.PARENT);
  // Navigate to settings tab
  const settingsTab = page
    .locator('[data-testid="tab-settings"], [aria-label*="settings" i], [aria-label*="Settings" i]')
    .first();
  await settingsTab.click();
  await page.waitForSelector('[data-testid="settings-screen"]', { timeout: 15_000 });
  await page.waitForTimeout(500);
}

test.describe('Settings – Parent Mobile App', () => {
  test('PA-SET01: settings screen is visible after navigation', async ({ page }) => {
    await setupAndNavigate(page);
    await expect(page.locator('[data-testid="settings-screen"]')).toBeVisible({ timeout: 10_000 });
  });

  test('PA-SET02: preference card for BOARD is visible', async ({ page }) => {
    await setupAndNavigate(page);
    await expect(page.locator('[data-testid="pref-card-BOARD"]')).toBeVisible({ timeout: 10_000 });
  });

  test('PA-SET03: preference card for ALIGHT is visible', async ({ page }) => {
    await setupAndNavigate(page);
    await expect(page.locator('[data-testid="pref-card-ALIGHT"]')).toBeVisible({ timeout: 10_000 });
  });

  test('PA-SET04: preference card for EMERGENCY is visible', async ({ page }) => {
    await setupAndNavigate(page);
    await expect(page.locator('[data-testid="pref-card-EMERGENCY"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('PA-SET05: three preference cards are rendered', async ({ page }) => {
    await setupAndNavigate(page);
    const cards = page.locator('[data-testid^="pref-card-"]');
    await expect(cards).toHaveCount(3, { timeout: 10_000 });
  });

  test('PA-SET06: EMERGENCY PUSH toggle is disabled (locked)', async ({ page }) => {
    await setupAndNavigate(page);
    const emergencyPush = page.locator('[data-testid="pref-EMERGENCY-PUSH"]');
    await expect(emergencyPush).toBeVisible({ timeout: 10_000 });
    // EMERGENCY is locked — the button should have aria-disabled
    const disabled = await emergencyPush.getAttribute('aria-disabled');
    expect(disabled).toBe('true');
  });

  test('PA-SET07: BOARD PUSH toggle is enabled (not locked)', async ({ page }) => {
    await setupAndNavigate(page);
    const boardPush = page.locator('[data-testid="pref-BOARD-PUSH"]');
    await expect(boardPush).toBeVisible({ timeout: 10_000 });
    const disabled = await boardPush.getAttribute('aria-disabled');
    expect(disabled).not.toBe('true');
  });

  test('PA-SET08: save preferences button is visible', async ({ page }) => {
    await setupAndNavigate(page);
    await expect(page.locator('[data-testid="settings-save"]')).toBeVisible({ timeout: 10_000 });
  });

  test('PA-SET09: tapping save shows success banner', async ({ page }) => {
    await mockApiResponses(page, {
      login: true,
      children: FULL_CHILDREN,
      alerts: [],
      alertHistory: [],
      notificationPreferences: MOCK_PREFS,
    });
    await loginAs(page, TEST_USERS.PARENT);
    const settingsTab = page
      .locator(
        '[data-testid="tab-settings"], [aria-label*="settings" i], [aria-label*="Settings" i]',
      )
      .first();
    await settingsTab.click();
    await page.waitForSelector('[data-testid="settings-screen"]', { timeout: 15_000 });
    await page.waitForTimeout(500);

    await page.locator('[data-testid="settings-save"]').click();
    await expect(page.locator('[data-testid="settings-saved-banner"]')).toBeVisible({
      timeout: 8_000,
    });
  });

  test('PA-SET10: no critical console errors on settings screen', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await setupAndNavigate(page);

    const critical = errors.filter(
      (e) =>
        !e.includes('Failed to fetch') &&
        !e.includes('net::ERR') &&
        !e.includes('AbortError') &&
        !e.includes('CORS policy') &&
        !e.includes('Access-Control-Allow-Origin'),
    );
    expect(critical).toHaveLength(0);
  });
});
