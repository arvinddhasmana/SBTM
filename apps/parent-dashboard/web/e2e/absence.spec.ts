/**
 * E2E: Absence Report Page — Parent Dashboard Web
 *
 * Covers form rendering, field interactions, submission, success/error states.
 *
 * Test IDs: WPD-ABS01–WPD-ABS10
 */
import { test, expect, MOCK_CHILDREN, mockApiRoutes, injectSession } from './fixtures';

test.describe('Absence Report – Parent Dashboard Web', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page, { children: MOCK_CHILDREN });
    await page.goto('/login');
    await injectSession(page);
    await page.goto('/absence');
    await page.waitForURL('**/absence');
    await page.waitForTimeout(500);
  });

  test('WPD-ABS01: renders page heading', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-ABS02: shows child select dropdown', async ({ page }) => {
    const select = page.locator('select').first();
    await expect(select).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-ABS03: child dropdown contains the mocked children', async ({ page }) => {
    const options = page.locator('select').first().locator('option');
    await expect(options).toHaveCount(MOCK_CHILDREN.length, { timeout: 10_000 });
  });

  test('WPD-ABS04: shows date input', async ({ page }) => {
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-ABS05: shows route type select (AM/PM/BOTH)', async ({ page }) => {
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThanOrEqual(2); // child + routeType selects
  });

  test('WPD-ABS06: shows notes textarea', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-ABS07: shows submit button', async ({ page }) => {
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-ABS08: can type into notes textarea', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Doctor appointment');
    await expect(textarea).toHaveValue('Doctor appointment');
  });

  test('WPD-ABS09: successful submit shows success banner', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Test note');
    await page.locator('button[type="submit"]').click();
    // Success indicator (green border / checkmark)
    await expect(page.locator('.border-green-300, .bg-green-50').first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test('WPD-ABS10: no children message shown when user has no children', async ({ page }) => {
    await mockApiRoutes(page, { children: [] });
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('parent_user') ?? '{}');
      user.children = [];
      localStorage.setItem('parent_user', JSON.stringify(user));
    });
    await page.goto('/absence');
    await page.waitForTimeout(600);
    await expect(page.locator('text=/no children/i')).toBeVisible({ timeout: 10_000 });
  });
});
