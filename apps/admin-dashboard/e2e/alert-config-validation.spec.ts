import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './fixtures';

const SECTIONS = [
  { title: 'Event Type Configuration', minCount: 10, path: 'event-types' },
  { title: 'Escalation Timing', minCount: 3, path: 'escalation-timing' },
  { title: 'Notification Routing', minCount: 7, path: 'notification-routing' },
  { title: 'Workflow Configuration', minCount: 14, path: 'workflow' },
] as const;

test.describe('Alert Configuration Validation', () => {
  test('shows non-zero counts for default seed configurations', async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedApiRequests: { url: string; status: number }[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('response', (resp) => {
      const url = resp.url();
      if (url.includes('/api/v1/alert-config/') && resp.status() >= 400) {
        failedApiRequests.push({ url, status: resp.status() });
      }
    });

    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/alert-config', { waitUntil: 'domcontentloaded' });

    for (const section of SECTIONS) {
      const card = page.locator(`a[href$="/alert-config/${section.path}"]`).first();
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect
        .poll(
          async () => {
            const text = (await card.innerText()).trim();
            const match = text.match(/(\d+)/);
            return match ? Number(match[1]) : 0;
          },
          { timeout: 15_000, message: `${section.title} count never reached ${section.minCount}` },
        )
        .toBeGreaterThanOrEqual(section.minCount);
    }

    await page.screenshot({
      path: 'test-results/alert-config-dashboard.png',
      fullPage: true,
    });

    expect(failedApiRequests, JSON.stringify(failedApiRequests)).toHaveLength(0);

    const nestedButtonWarnings = consoleErrors.filter((m) =>
      /<button> cannot contain a nested <button>/i.test(m),
    );
    expect(nestedButtonWarnings, nestedButtonWarnings.join('\n')).toHaveLength(0);
  });

  test('escalation timing page lists default tier records', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/alert-config/escalation-timing', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1').last()).toContainText('Escalation Timing', { timeout: 15_000 });
    await expect(page.getByText('TIER_1', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('TIER_2', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('TIER_3', { exact: false }).first()).toBeVisible();

    await page.screenshot({
      path: 'test-results/alert-config-escalation-timing.png',
      fullPage: true,
    });
  });

  test('event types page lists default event records', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/alert-config/event-types', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1').last()).toContainText('Event Type', { timeout: 15_000 });
    await expect(page.getByText('PANIC_BUTTON', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('ROUTE_DEVIATION', { exact: false }).first()).toBeVisible();

    await page.screenshot({
      path: 'test-results/alert-config-event-types.png',
      fullPage: true,
    });
  });

  test('notification routing page lists default routing rules', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/alert-config/notification-routing', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1').last()).toContainText('Notification Routing', {
      timeout: 15_000,
    });
    await expect(page.getByText('TIER_1', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.screenshot({
      path: 'test-results/alert-config-notification-routing.png',
      fullPage: true,
    });
  });

  test('workflow configuration page lists default actions', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/alert-config/workflow', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1').last()).toContainText('Workflow', { timeout: 15_000 });
    await expect(page.getByText(/CONFIRM|ACKNOWLEDGE|RESOLVE/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.screenshot({
      path: 'test-results/alert-config-workflow.png',
      fullPage: true,
    });
  });

  test('dashboard alerts page renders without nested-button warnings', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: 'test-results/alert-config-dashboard-alerts.png',
      fullPage: true,
    });

    const nestedButtonWarnings = consoleErrors.filter((m) =>
      /<button> cannot contain a nested <button>/i.test(m),
    );
    expect(nestedButtonWarnings, nestedButtonWarnings.join('\n')).toHaveLength(0);
    expect(TEST_USERS.SUPER_ADMIN.role).toBe('SUPER_ADMIN');
  });
});
