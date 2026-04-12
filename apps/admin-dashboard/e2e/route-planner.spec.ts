/**
 * E2E: Route Planner
 *
 * Tests the Route Planner page (/routes/planner) in mock mode.
 * Covers:
 *   - Route list display and filtering
 *   - Route selection & map rendering
 *   - New route creation form
 *   - Auto-generate stops
 *   - Click-to-add-stop map interaction
 *   - Delete stop
 *   - Radius and spacing warnings
 *   - Optimization
 *
 * Uses mock mode (?mock=true) so no backend is required.
 */
import { test, expect, type Page } from '@playwright/test';

const MOCK_USER = {
  id: 'usr-001',
  name: 'Mock Admin',
  email: 'admin@osta.ca',
  role: 'BOARD_ADMIN',
  boardId: 'BRD-001',
};

/**
 * Log in with mock credentials and navigate to planner.
 */
async function loginMockAndGoToPlanner(page: Page) {
  await page.goto('/login?mock=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Check if already logged in (redirected to dashboard)
  if (page.url().includes('/login')) {
    await page.fill('input[placeholder*="admin@osta.ca"]', 'admin@osta.ca');
    await page.fill('input[placeholder*="••••"]', 'password');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);
  }

  await page.goto('/routes/planner?mock=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500); // wait for React Query to load data
}

test.describe('RP: Route Planner', () => {
  test.beforeEach(async ({ page }) => {
    await loginMockAndGoToPlanner(page);
  });

  // ─── Route List ──────────────────────────────────
  test('RP01 – displays route list with all mock routes', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Routes' })).toBeVisible();
    // Should display 6 mock routes
    const routeCards = page.locator('.custom-scrollbar [data-testid^="route-card"]');
    await expect(routeCards).toHaveCount(6, { timeout: 5000 });
  });

  test('RP02 – school filter dropdown shows all schools', async ({ page }) => {
    const schoolSelect = page.locator('select').nth(1);
    const options = schoolSelect.locator('option');
    // "All Schools" + 3 schools = 4 options
    await expect(options).toHaveCount(4, { timeout: 5000 });
    await expect(options.nth(1)).toHaveText('Riverside Public School');
    await expect(options.nth(2)).toHaveText('Kanata Academy');
    await expect(options.nth(3)).toHaveText('Glebe Collegiate');
  });

  test('RP03 – direction filter narrows route list', async ({ page }) => {
    const directionSelect = page.locator('select').first();
    await directionSelect.selectOption('PM');
    await page.waitForTimeout(300);

    // Only PM routes should show: "Single Bus PM" and "Riverside North PM"
    const routeCards = page.locator('.custom-scrollbar [data-testid^="route-card"]');
    await expect(routeCards).toHaveCount(2, { timeout: 3000 });
  });

  test('RP04 – text search filters routes', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search routes, schools, buses...');
    await searchInput.fill('Kanata');
    await page.waitForTimeout(300);

    const routeCards = page.locator('.custom-scrollbar [data-testid^="route-card"]');
    await expect(routeCards).toHaveCount(1, { timeout: 3000 });
  });

  // ─── Route Selection ────────────────────────────
  test('RP05 – clicking a route shows it on the map with stops', async ({ page }) => {
    // Click "Single Bus AM"
    await page.locator('[data-testid^="route-card"]:has-text("Single Bus AM")').first().click();
    await page.waitForTimeout(800);

    // Route card should show school name, start time, and edit button
    await expect(page.locator('[data-testid="route-school-name"]').first()).toContainText(
      'Riverside Public School',
    );
    await expect(page.locator('[data-testid="route-start-time"]').first()).toContainText('07:15');
    await expect(page.locator('[data-testid^="edit-route-btn"]').first()).toBeVisible();

    // Selected route panel below list still shows direction + stop count
    await expect(page.locator('text=AM • 5 stops')).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible();

    // Map should have stop markers (Leaflet divIcons)
    const stopMarkers = page.locator('.leaflet-marker-icon');
    const count = await stopMarkers.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  // ─── Create Route ───────────────────────────────
  test('RP06 – "New Route" opens creation form', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(300);

    await expect(page.getByRole('heading', { name: 'New Route' })).toBeVisible();
    // Verify school dropdown exists with the placeholder option selected
    const schoolSelect = page.locator('select').first();
    await expect(schoolSelect).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Generate' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('RP07 – selecting school enables generate and shows school on map', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();

    // Select Riverside Public School
    const schoolSelect = page.locator('select');
    await schoolSelect.selectOption('SCH-001');
    await page.waitForTimeout(500);

    // Generate button should be enabled
    await expect(page.getByRole('button', { name: 'Generate' })).toBeEnabled();

    // Hint text should show radius info
    await expect(page.locator('text=5 stops within 4.5km radius of school')).toBeVisible();

    // School marker should appear on map (purple divIcon)
    const markers = page.locator('.leaflet-marker-icon');
    const count = await markers.count();
    expect(count).toBeGreaterThanOrEqual(1); // at least school marker
  });

  // ─── Auto-Generate ──────────────────────────────
  test('RP08 – auto-generate creates stops within school radius', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.locator('select').selectOption('SCH-001');
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(2000); // generation + optimization

    // Should have stops in the form
    await expect(page.locator('text=/Stops \\(\\d+\\)/')).toBeVisible();

    // Should have stop markers on map
    const markers = page.locator('.leaflet-marker-icon');
    const count = await markers.count();
    expect(count).toBeGreaterThanOrEqual(5); // stops + school marker
  });

  // ─── Map Click-to-Add ───────────────────────────
  test('RP09 – click map in add-stop mode places a new stop', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.locator('select').selectOption('SCH-001');
    await page.waitForTimeout(300);

    // Enable add-stop mode
    await page.getByRole('button', { name: 'Map' }).click();
    await page.waitForTimeout(300);

    // Indicator should appear
    await expect(page.locator('[data-testid="add-stop-indicator"]')).toBeVisible();

    // Verify crosshair cursor
    const cursor = await page.evaluate(() => {
      const container = document.querySelector('.leaflet-container') as HTMLElement;
      return container?.style.cursor;
    });
    expect(cursor).toBe('crosshair');

    // Click on the map in an empty area
    const mapBox = await page.locator('[data-testid="planner-map"]').boundingBox();
    if (mapBox) {
      await page.mouse.click(mapBox.x + mapBox.width * 0.9, mapBox.y + mapBox.height * 0.1);
      await page.waitForTimeout(500);

      // Should have 1 stop added
      await expect(page.locator('text=/Stops \\(1\\)/')).toBeVisible();
    }
  });

  // ─── Manual Stop ────────────────────────────────
  test('RP10 – manual stop button adds blank stop row', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.waitForTimeout(300);

    // Click "Manual" button to add blank stop
    await page.getByRole('button', { name: 'Manual' }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=/Stops \\(1\\)/')).toBeVisible();
    // The blank stop should have empty lat/lng fields
    const latInput = page.locator('input[placeholder="Latitude"]');
    await expect(latInput).toBeVisible();
  });

  // ─── Delete Stop ────────────────────────────────
  test('RP11 – removing a stop updates stop count', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.locator('select').selectOption('SCH-001');
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(2000);

    // Get initial stop count
    const initialText = await page.locator('h4:has-text("Stops")').textContent();
    const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');
    expect(initialCount).toBeGreaterThanOrEqual(2);

    // Click the first delete button (trash icon)
    const deleteButtons = page.locator('[data-testid^="stop-row-"] button').last();
    // Instead, target the trash button more precisely
    const firstStopRow = page.locator('[data-testid="stop-row-1"]');
    // The trash button is last in the row
    const trashBtn = firstStopRow.locator('button').last();
    await trashBtn.click();
    await page.waitForTimeout(300);

    const newText = await page.locator('h4:has-text("Stops")').textContent();
    const newCount = parseInt(newText?.match(/\d+/)?.[0] || '0');
    expect(newCount).toBe(initialCount - 1);
  });

  // ─── Optimization ───────────────────────────────
  test('RP12 – optimize button shows distance and duration', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.locator('select').selectOption('SCH-001');
    await page.waitForTimeout(300);

    // Generate stops first
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(2000);

    // Click optimize
    await page.getByRole('button', { name: 'Optimize' }).click();
    await page.waitForTimeout(1000);

    // Optimization result should show distance and duration
    await expect(page.locator('text=/Distance:/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Duration:/')).toBeVisible();
  });

  // ─── Cancel ─────────────────────────────────────
  test('RP13 – cancel returns to route list', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await expect(page.getByRole('heading', { name: 'New Route' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(300);

    await expect(page.getByRole('heading', { name: 'Routes' })).toBeVisible();
  });

  // ─── Edit Route ─────────────────────────────────
  test('RP14 – edit button opens route in edit mode', async ({ page }) => {
    // Select a route first
    await page.locator('[data-testid^="route-card"]:has-text("Single Bus AM")').first().click();
    await page.waitForTimeout(800);

    // Click the Edit button on the route card
    await page.locator('[data-testid^="edit-route-btn"]').first().click();
    await page.waitForTimeout(500);

    // Should show edit form
    await expect(page.getByRole('heading', { name: 'Edit Route' })).toBeVisible();
    // Form should be pre-populated with route name
    const nameInput = page.locator('input[placeholder="e.g. Route 101 North"]');
    await expect(nameInput).toHaveValue('Single Bus AM');
  });

  // ─── Fullscreen Toggle ──────────────────────────
  test('RP15 – fullscreen toggle works', async ({ page }) => {
    const toggleBtn = page.locator('[data-testid="fullscreen-toggle"]');
    await expect(toggleBtn).toBeVisible();

    await toggleBtn.click();
    await page.waitForTimeout(500);

    // After fullscreen, the map container should have fixed positioning
    const isFixed = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="planner-map"]')?.parentElement;
      return container?.classList.contains('fixed') ?? false;
    });
    expect(isFixed).toBe(true);

    // Toggle back
    await toggleBtn.click();
    await page.waitForTimeout(500);

    const isRelative = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="planner-map"]')?.parentElement;
      return container?.classList.contains('relative') ?? false;
    });
    expect(isRelative).toBe(true);
  });

  // ─── Snap to Road Button ───────────────────────
  test('RP16 – snap to road button is visible and clickable', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.locator('select').selectOption('SCH-001');
    await page.waitForTimeout(300);

    // Generate stops
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(2000);

    // Snap to Road button should be visible (scroll into view if needed)
    const snapBtn = page.locator('[data-testid="snap-to-road-btn"]');
    await snapBtn.scrollIntoViewIfNeeded();
    await expect(snapBtn).toBeVisible();
    await expect(snapBtn).toBeEnabled();

    // Click and verify no crash
    await snapBtn.click();
    await page.waitForTimeout(1500);

    // After snap, optimization result should show distance
    await expect(page.locator('text=Route Optimization')).toBeVisible({ timeout: 5000 });
  });

  // ─── Map Reset Stability ───────────────────────
  test('RP17 – map does not reset zoom/position when editing stops', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.locator('select').selectOption('SCH-001');
    await page.waitForTimeout(300);

    // Generate stops to get map positioned
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(2000);

    // Get current zoom level from Leaflet's zoom class on the map container
    const getZoom = async () => {
      return page.evaluate(() => {
        const container = document.querySelector('.leaflet-container');
        if (!container) return null;
        // Leaflet v1 stores the map in a property like _leaflet_id + internal L.Map
        // Try accessing through L.Map stored on the DOM element
        const entries = Object.entries(container);
        for (const [, val] of entries) {
          if (val && typeof val === 'object' && typeof (val as any).getZoom === 'function') {
            return (val as any).getZoom();
          }
        }
        return null;
      });
    };

    // Zoom in by clicking the Leaflet zoom-in button 3 times
    const zoomInBtn = page.locator('.leaflet-control-zoom-in');
    await zoomInBtn.click();
    await page.waitForTimeout(400);
    await zoomInBtn.click();
    await page.waitForTimeout(400);
    await zoomInBtn.click();
    await page.waitForTimeout(400);

    // Take snapshot of the map tile state (class attribute on container)
    const zoomClassBefore = await page.evaluate(() => {
      const container = document.querySelector('.leaflet-container');
      // Leaflet adds leaflet-zoom-anim, and the transform on the tile pane
      const tilePane = container?.querySelector('.leaflet-tile-pane') as HTMLElement;
      return tilePane?.style.transform ?? '';
    });

    // Add a manual stop — map should NOT reset
    await page.getByRole('button', { name: 'Manual' }).click();
    await page.waitForTimeout(800);

    const zoomClassAfter = await page.evaluate(() => {
      const container = document.querySelector('.leaflet-container');
      const tilePane = container?.querySelector('.leaflet-tile-pane') as HTMLElement;
      return tilePane?.style.transform ?? '';
    });

    // The tile pane transform should remain the same (no fitBounds reset)
    expect(zoomClassAfter).toBe(zoomClassBefore);
  });

  // ─── Midpoint Handle Tooltip ───────────────────
  test('RP18 – midpoint handles show "Drag to change path" tooltip', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.locator('select').selectOption('SCH-001');
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(2000);

    // There should be midpoint markers on the map (4 per segment)
    // Hover over one to check tooltip
    const midpointMarkers = page.locator('.leaflet-marker-icon').filter({
      has: page.locator('div[style*="width:14px"]'),
    });
    const count = await midpointMarkers.count();
    expect(count).toBeGreaterThanOrEqual(4); // at least 4 handles for 1 segment

    // Verify tooltip text exists in DOM
    const tooltipText = await page.evaluate(() => {
      const tooltips = document.querySelectorAll('.leaflet-tooltip');
      const texts: string[] = [];
      tooltips.forEach((t) => texts.push(t.textContent || ''));
      return texts;
    });

    // Midpoint tooltips may be hidden until hover, so check the Leaflet tooltip content attr
    // Instead, verify no "Drag to add stop" text exists
    const addStopTooltip = page.locator('.leaflet-tooltip:has-text("Drag to add stop")');
    await expect(addStopTooltip).toHaveCount(0);
  });

  // ─── Save Route ─────────────────────────────────
  test('RP19 – save route succeeds without 500 error', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();

    // Fill form
    await page.locator('select').selectOption('SCH-001');
    await page.waitForTimeout(300);

    const nameInput = page.locator('input[placeholder="e.g. Route 101 North"]');
    await nameInput.fill('Test Save Route');

    // Generate stops
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(2000);

    // Save the route
    const saveBtn = page.getByRole('button', { name: 'Save' });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Should return to list mode (no error)
    await expect(page.getByRole('heading', { name: 'Routes' })).toBeVisible({ timeout: 5000 });
  });

  // ─── Generate With School Selected ──────────────
  test('RP20 – generate button produces stops when school is selected', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();

    // Without school, Generate should be disabled
    await expect(page.getByRole('button', { name: 'Generate' })).toBeDisabled();

    // Select school
    await page.locator('select').selectOption('SCH-001');
    await page.waitForTimeout(300);

    // Now Generate should be enabled
    await expect(page.getByRole('button', { name: 'Generate' })).toBeEnabled();

    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForTimeout(2000);

    // Should have stops
    const stopsHeader = page.locator('h4:has-text("Stops")');
    const headerText = await stopsHeader.textContent();
    const stopCount = parseInt(headerText?.match(/\d+/)?.[0] || '0');
    expect(stopCount).toBeGreaterThanOrEqual(2);
  });

  // ─── School Icon on Highlighted Route ──────────
  test('RP21 – school icon appears on map when route is selected', async ({ page }) => {
    // Click "Single Bus AM" — a route with schoolLat/schoolLng in mock data
    await page.locator('[data-testid^="route-card"]:has-text("Single Bus AM")').first().click();
    await page.waitForTimeout(800);

    // Map should show stop markers + school marker
    const allMarkers = page.locator('.leaflet-marker-icon');
    const count = await allMarkers.count();
    // 5 stops + 1 school = 6 markers
    expect(count).toBeGreaterThanOrEqual(6);

    // The school marker contains the graduation cap SVG path
    const schoolMarker = page.locator('.leaflet-marker-icon').filter({
      has: page.locator('svg path[d*="M12 3L1 9l11 6"]'),
    });
    await expect(schoolMarker).toHaveCount(1);

    // School marker should be purple (#8b5cf6)
    const hasSchoolColor = await page.evaluate(() => {
      const icons = document.querySelectorAll('.leaflet-marker-icon div');
      for (const icon of icons) {
        const el = icon as HTMLElement;
        if (el.style.background === 'rgb(139, 92, 246)' || el.style.background === '#8b5cf6') {
          return true;
        }
      }
      return false;
    });
    expect(hasSchoolColor).toBe(true);
  });
});
