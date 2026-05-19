/**
 * E2E: Dashboard Page — Parent Dashboard Web
 *
 * Covers children card grid, status badges, active-alert banners, and the
 * "Track Bus Live" navigation.
 *
 * Test IDs: WPD-DASH01–WPD-DASH12
 */
import { test, expect, MOCK_CHILDREN, mockApiRoutes, injectSession } from './fixtures';

test.describe('Dashboard – Parent Dashboard Web', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page, { children: MOCK_CHILDREN });
    await page.goto('/login');
    await injectSession(page);
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');
    // Wait for children list to render
    await page.waitForTimeout(800);
  });

  test('WPD-DASH01: shows page heading', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('WPD-DASH02: renders a card for each child', async ({ page }) => {
    const cards = page.locator('.glass-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(MOCK_CHILDREN.length);
  });

  test('WPD-DASH03: shows child name on their card', async ({ page }) => {
    await expect(page.getByText('John Doe')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Jane Doe')).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-DASH04: shows school name on child cards', async ({ page }) => {
    const schoolNames = page.getByText('Test Elementary');
    await expect(schoolNames.first()).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-DASH05: shows status badge for each child', async ({ page }) => {
    // Status text rendered via i18n: "On the Bus" | "At School" | "At Home"
    const statusBadge = page.locator('text=/on.*(bus|school|home)/i');
    await expect(statusBadge.first()).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-DASH06: "Track Bus Live" button is present per child card', async ({ page }) => {
    const trackButtons = page.getByText(/track bus live/i);
    await expect(trackButtons.first()).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-DASH07: empty state shown when no children', async ({ page }) => {
    await mockApiRoutes(page, { children: [] });
    // Re-inject session with no children
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('parent_user') ?? '{}');
      user.children = [];
      localStorage.setItem('parent_user', JSON.stringify(user));
    });
    await page.goto('/dashboard');
    await page.waitForTimeout(800);
    await expect(page.locator('text=/no children/i')).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-DASH08: shows active alert banner when alert is present', async ({ page }) => {
    await mockApiRoutes(page, {
      children: MOCK_CHILDREN,
      activeAlerts: [
        {
          id: 'al-1',
          routeId: 'route-am-1',
          vehicleId: 'BUS-01',
          eventType: 'PANIC_BUTTON',
          message: 'Emergency!',
          alertActive: true,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await page.reload();
    await page.waitForTimeout(1200);
    const alertBanner = page.locator('.bg-pink-500\\/10').first();
    await expect(alertBanner).toBeVisible({ timeout: 10_000 });
  });

  test('WPD-DASH09: clicking "Track Bus Live" navigates to /map', async ({ page }) => {
    const trackBtn = page.getByText(/track bus live/i).first();
    await expect(trackBtn).toBeVisible({ timeout: 10_000 });
    await trackBtn.click();
    await page.waitForURL('**/map*', { timeout: 10_000 });
    expect(page.url()).toContain('map');
  });

  test('WPD-DASH10: no critical console errors on dashboard', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.reload();
    await page.waitForTimeout(800);
    const critical = errors.filter(
      (e) =>
        !e.includes('Failed to fetch') &&
        !e.includes('net::ERR') &&
        !e.includes('AbortError') &&
        !e.includes('favicon'),
    );
    expect(critical).toHaveLength(0);
  });
});
