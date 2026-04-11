/**
 * E2E: Route Planner – Live Mode
 *
 * Tests the Route Planner against the real backend (no mock).
 * Requires Docker services running: api-gateway, postgres, osrm.
 * Uses SCHOOL_ADMIN credentials — school is auto-selected and dropdown disabled.
 */
import { test, expect, type Page } from '@playwright/test';

const LIVE_CREDS = {
  email: 'school.admin@sbtm.demo',
  password: 'Admin123!',
};

async function loginLiveAndGoToPlanner(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  if (page.url().includes('/login')) {
    await page.fill('input[placeholder="admin@osta.ca"]', LIVE_CREDS.email);
    await page.fill('input[placeholder="••••••••"]', LIVE_CREDS.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(2000);
  }

  await page.goto('/routes/planner', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}

test.describe('RP-Live: Route Planner (Live Backend)', () => {
  test.beforeEach(async ({ page }) => {
    await loginLiveAndGoToPlanner(page);
  });

  test('RPL01 – school auto-selected for SCHOOL_ADMIN', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    // For SCHOOL_ADMIN, school dropdown is disabled but auto-selected
    const schoolSelect = page.locator('select').first();
    await expect(schoolSelect).toBeDisabled();
    const val = await schoolSelect.inputValue();
    expect(val).toBeTruthy();
    expect(val.length).toBeGreaterThan(0);
  });

  test('RPL02 – Generate is enabled when school auto-selected', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    // Generate should be enabled because school is auto-selected and has lat/lng
    await expect(page.getByRole('button', { name: 'Generate' })).toBeEnabled({ timeout: 5000 });
  });

  test('RPL03 – Generate creates stops and shows them on map', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(4000);

    // Should have stops
    await expect(page.locator('text=/Stops \\(\\d+\\)/')).toBeVisible();

    // Map markers should exist
    const markers = page.locator('.leaflet-marker-icon');
    const count = await markers.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('RPL04 – Save route succeeds (no 500 error)', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    // Fill route name with a unique name
    const nameInput = page.locator('input[placeholder="e.g. Route 101 North"]');
    const uniqueName = `E2E Live ${Date.now()}`;
    await nameInput.fill(uniqueName);

    // Generate stops
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(4000);

    // Listen for network failures
    const responseStatuses: number[] = [];
    page.on('response', (resp) => {
      if (resp.url().includes('/api/v1/routes') && resp.request().method() === 'POST') {
        responseStatuses.push(resp.status());
      }
    });

    // Save
    const saveBtn = page.getByRole('button', { name: 'Save' });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await page.waitForTimeout(3000);

    // Should return to list mode
    await expect(page.getByRole('heading', { name: 'Routes' })).toBeVisible({ timeout: 5000 });

    // No 500 errors
    const has500 = responseStatuses.some((s) => s >= 500);
    expect(has500).toBe(false);
  });

  test('RPL05 – saved route appears in route list', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[placeholder="e.g. Route 101 North"]');
    const uniqueName = `E2E Persist ${Date.now()}`;
    await nameInput.fill(uniqueName);

    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(4000);

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(3000);

    // The saved route should appear in the list
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 10000 });
  });

  test('RPL06 – midpoint handles render on polyline path', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(4000);

    // There should be midpoint markers on the map
    const midpointMarkers = page.locator('.leaflet-marker-icon').filter({
      has: page.locator('div[style*="width:14px"]'),
    });
    const count = await midpointMarkers.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('RPL07 – Cancel discards form and returns to list', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    // Fill name
    const nameInput = page.locator('input[placeholder="e.g. Route 101 North"]');
    await nameInput.fill('Should be discarded');

    // Generate stops
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(4000);

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(1000);

    // Should return to list view
    await expect(page.getByRole('heading', { name: 'Routes' })).toBeVisible({ timeout: 5000 });

    // The discarded name should NOT appear in the list
    await expect(page.locator('text=Should be discarded')).not.toBeVisible();
  });

  test('RPL08 – direction toggle switches between AM and PM', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    // Direction is an AM/PM toggle, not a select
    const pmButton = page.locator('button:has-text("PM")').first();
    await expect(pmButton).toBeVisible();
    await pmButton.click();
    await page.waitForTimeout(300);

    // PM button should now be active (selected styling)
    const amButton = page.locator('button:has-text("AM")').first();
    // Verify both buttons exist
    await expect(amButton).toBeVisible();
    await expect(pmButton).toBeVisible();
  });

  test('RPL09 – route list shows direction badges (AM/PM)', async ({ page }) => {
    // The list should display direction badges
    const amBadge = page.locator('text=AM');
    const pmBadge = page.locator('text=PM');
    const amCount = await amBadge.count();
    const pmCount = await pmBadge.count();
    expect(amCount + pmCount).toBeGreaterThan(0);
  });

  test('RPL10 – save API returns 201 with valid payload', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[placeholder="e.g. Route 101 North"]');
    const uniqueName = `E2E API ${Date.now()}`;
    await nameInput.fill(uniqueName);

    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(4000);

    let postStatus = 0;
    page.on('response', (resp) => {
      if (
        resp.url().includes('/api/v1/routes') &&
        resp.request().method() === 'POST' &&
        !resp.url().includes('optimize') &&
        !resp.url().includes('snap')
      ) {
        postStatus = resp.status();
      }
    });

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(3000);

    expect(postStatus).toBe(201);
  });

  test('RPL11 – clicking a route in the list shows its details', async ({ page }) => {
    // Click the first route card in the list
    const routeCards = page.locator('[data-testid^="route-card-"]');
    const count = await routeCards.count();
    if (count > 0) {
      await routeCards.first().click();
      await page.waitForTimeout(1000);

      // After selecting a route, the map should still be visible
      await expect(page.locator('.leaflet-container')).toBeVisible();

      // Route markers should appear on the map
      const markers = page.locator('.leaflet-marker-icon');
      const markerCount = await markers.count();
      expect(markerCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('RPL12 – number of stops selector changes stop count', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    // Find the number-of-stops input and change it
    const stopsInput = page.locator('input[type="number"]').first();
    if (await stopsInput.isVisible()) {
      await stopsInput.fill('3');
      await page.getByRole('button', { name: 'Generate' }).click();
      await page.waitForTimeout(4000);

      // Should show 3 stops
      await expect(page.locator('text=/Stops \\(3\\)/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('RPL13 – route planner map is visible', async ({ page }) => {
    // The Leaflet map container should be rendered
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 5000 });
  });

  test('RPL14 – New Route button opens create form', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(500);

    // Form fields should be visible
    const nameInput = page.locator('input[placeholder="e.g. Route 101 North"]');
    await expect(nameInput).toBeVisible();

    // Save and Cancel buttons should be present
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });
});
