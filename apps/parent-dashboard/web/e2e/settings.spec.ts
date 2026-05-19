/**
 * E2E: Settings (Notification Preferences) — Parent Dashboard Web
 *
 * Covers preference card rendering, toggle interactions, save and
 * locked EMERGENCY preference enforcement.
 *
 * Test IDs: WPD-SET01–WPD-SET08
 */
import { test, expect, MOCK_CHILDREN, MOCK_PREFS, mockApiRoutes, injectSession } from './fixtures';

test.describe('Settings – Parent Dashboard Web', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page, { children: MOCK_CHILDREN, prefs: MOCK_PREFS });
    await page.goto('/login');
    await injectSession(page);
    await page.goto('/settings');
    await page.waitForURL('**/settings');
    await page.waitForTimeout(800);
  });

  test('WPD-SET01: renders page heading', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-SET02: shows preference cards for each event type', async ({ page }) => {
    const cards = page.locator('.glass-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3); // BOARD, ALIGHT, EMERGENCY
  });

  test('WPD-SET03: shows EMERGENCY preference as "Always On" locked', async ({ page }) => {
    await expect(page.locator('text=/always.on/i')).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-SET04: PUSH and EMAIL channel buttons are visible', async ({ page }) => {
    await expect(page.locator('text=/push/i').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=/email/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-SET05: Save Preferences button is visible', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /save preferences/i });
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-SET06: toggling a non-locked preference changes its visual state', async ({ page }) => {
    // Find the PUSH button for BOARD event type (first non-locked event)
    // The button is active (indigo) or inactive (slate)
    const pushBtns = page.locator('button').filter({ hasText: /push/i });
    const firstPush = pushBtns.first();
    await expect(firstPush).toBeVisible({ timeout: 10_000 });
    const classBefore = await firstPush.getAttribute('class');
    await firstPush.click();
    await page.waitForTimeout(200);
    const classAfter = await firstPush.getAttribute('class');
    // The class should have changed (toggled)
    expect(classBefore).not.toBe(classAfter);
  });

  test('WPD-SET07: clicking Save shows success confirmation', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /save preferences/i });
    await saveBtn.click();
    await expect(page.locator('.bg-emerald-900\\/20, [class*="emerald"]').first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test('WPD-SET08: EMERGENCY toggle buttons are disabled (always-on)', async ({ page }) => {
    // EMERGENCY section has disabled buttons
    const disabledBtns = page.locator('button[disabled]');
    const count = await disabledBtns.count();
    expect(count).toBeGreaterThanOrEqual(2); // PUSH + EMAIL for EMERGENCY
  });
});
