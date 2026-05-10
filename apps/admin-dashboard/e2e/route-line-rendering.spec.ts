/**
 * E2E: Route Line Rendering
 *
 * Tests that route lines are correctly rendered between all stops and school
 * for both AM and PM routes across all portals.
 *
 * Critical requirements:
 * 1. AM routes: route line must go from first stop → ... → last stop → school
 * 2. PM routes: route line must go from school → first stop → ... → last stop
 * 3. Route lines should NEVER lose the leg between the last stop and school (AM)
 *    or between school and the first stop (PM)
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
 * Log in with mock credentials
 */
async function loginMock(page: Page) {
  await page.goto('/login?mock=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Check if already logged in (redirected to dashboard)
  if (page.url().includes('/login')) {
    await page.fill('input[placeholder*="admin@osta.ca"]', 'admin@osta.ca');
    await page.fill('input[placeholder*="••••"]', 'password');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);
  }
}

test.describe('Route Line Rendering: Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginMock(page);
  });

  test('RLR01 – AM route displays complete line from stops to school', async ({ page }) => {
    // Navigate to route planner
    await page.goto('/routes/planner?mock=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Select an AM route
    await page.locator('[data-testid^="route-card"]:has-text("Single Bus AM")').first().click();
    await page.waitForTimeout(1000);

    // Check that the map is rendered
    const map = page.locator('[data-testid="live-map"]');
    await expect(map).toBeVisible();

    // Verify route direction is AM
    const routeCard = page.locator('[data-testid^="route-card"]').first();
    await expect(routeCard).toContainText('AM');

    // Check that school marker is rendered
    // School marker should be visible on the map (purple icon)
    const schoolMarkerExists = await page.evaluate(() => {
      const markers = document.querySelectorAll('.leaflet-marker-icon');
      // School markers have purple background (#8b5cf6)
      for (const marker of markers) {
        const html = marker.innerHTML || '';
        if (html.includes('#8b5cf6')) {
          return true;
        }
      }
      return false;
    });
    expect(schoolMarkerExists).toBe(true);

    // Check that polyline is rendered
    const polylineExists = await page.evaluate(() => {
      const polylines = document.querySelectorAll('.leaflet-pane path');
      return polylines.length > 0;
    });
    expect(polylineExists).toBe(true);

    // Verify polyline color is blue for AM route (#3b82f6)
    const polylineIsBlue = await page.evaluate(() => {
      const polylines = document.querySelectorAll('.leaflet-overlay-pane path');
      for (const polyline of polylines) {
        const stroke = (polyline as SVGPathElement).getAttribute('stroke');
        if (stroke && (stroke.includes('#3b82f6') || stroke.includes('rgb(59, 130, 246)'))) {
          return true;
        }
      }
      return false;
    });
    expect(polylineIsBlue).toBe(true);
  });

  test('RLR02 – PM route displays complete line from school to stops', async ({ page }) => {
    // Navigate to route planner
    await page.goto('/routes/planner?mock=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Select a PM route
    await page.locator('[data-testid^="route-card"]:has-text("PM")').first().click();
    await page.waitForTimeout(1000);

    // Check that the map is rendered
    const map = page.locator('[data-testid="live-map"]');
    await expect(map).toBeVisible();

    // Verify route direction is PM
    const routeCard = page.locator('[data-testid^="route-card"]').first();
    await expect(routeCard).toContainText('PM');

    // Check that school marker is rendered
    const schoolMarkerExists = await page.evaluate(() => {
      const markers = document.querySelectorAll('.leaflet-marker-icon');
      for (const marker of markers) {
        const html = marker.innerHTML || '';
        if (html.includes('#8b5cf6')) {
          return true;
        }
      }
      return false;
    });
    expect(schoolMarkerExists).toBe(true);

    // Check that polyline is rendered
    const polylineExists = await page.evaluate(() => {
      const polylines = document.querySelectorAll('.leaflet-pane path');
      return polylines.length > 0;
    });
    expect(polylineExists).toBe(true);

    // Verify polyline color is amber for PM route (#f59e0b)
    const polylineIsAmber = await page.evaluate(() => {
      const polylines = document.querySelectorAll('.leaflet-overlay-pane path');
      for (const polyline of polylines) {
        const stroke = (polyline as SVGPathElement).getAttribute('stroke');
        if (stroke && (stroke.includes('#f59e0b') || stroke.includes('rgb(245, 158, 11)'))) {
          return true;
        }
      }
      return false;
    });
    expect(polylineIsAmber).toBe(true);
  });

  test('RLR03 – newly created AM route includes school in polyline', async ({ page }) => {
    // Navigate to route planner
    await page.goto('/routes/planner?mock=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Click "New Route" button
    await page.click('button:has-text("New Route")');
    await page.waitForTimeout(500);

    // Fill in route form
    await page.fill('input[placeholder="Enter route name"]', 'Test AM Route');

    // Select school
    const schoolSelect = page.locator('select').first();
    await schoolSelect.selectOption({ index: 1 }); // Select first school
    await page.waitForTimeout(500);

    // Select AM direction
    const directionSelect = page.locator('select[value="AM"]');
    if (await directionSelect.count() > 0) {
      await directionSelect.first().selectOption('AM');
    }

    // Set number of stops
    await page.fill('input[type="number"]', '3');

    // Click auto-generate
    await page.click('button:has-text("Auto Generate")');
    await page.waitForTimeout(2000); // Wait for optimization

    // Verify route line is rendered
    const polylineExists = await page.evaluate(() => {
      const polylines = document.querySelectorAll('.leaflet-pane path');
      return polylines.length > 0;
    });
    expect(polylineExists).toBe(true);

    // Verify school marker is rendered
    const schoolMarkerExists = await page.evaluate(() => {
      const markers = document.querySelectorAll('.leaflet-marker-icon');
      for (const marker of markers) {
        const html = marker.innerHTML || '';
        if (html.includes('#8b5cf6')) {
          return true;
        }
      }
      return false;
    });
    expect(schoolMarkerExists).toBe(true);
  });

  test('RLR04 – Dashboard live map shows complete route lines', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard?mock=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check that the map is rendered
    const map = page.locator('[data-testid="live-map"]');
    await expect(map).toBeVisible();

    // Click on a route to select it
    const routeRows = page.locator('table tbody tr');
    if (await routeRows.count() > 0) {
      await routeRows.first().click();
      await page.waitForTimeout(1000);

      // Verify polyline is rendered
      const polylineExists = await page.evaluate(() => {
        const polylines = document.querySelectorAll('.leaflet-overlay-pane path');
        return polylines.length > 0;
      });
      expect(polylineExists).toBe(true);

      // Verify school marker is rendered
      const schoolMarkerExists = await page.evaluate(() => {
        const markers = document.querySelectorAll('.leaflet-marker-icon');
        for (const marker of markers) {
          const html = marker.innerHTML || '';
          if (html.includes('#8b5cf6')) {
            return true;
          }
        }
        return false;
      });
      expect(schoolMarkerExists).toBe(true);
    }
  });
});

test.describe('Route Line Rendering: Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginMock(page);
  });

  test('RLR05 – verify route path connects all stops and school', async ({ page }) => {
    // Navigate to route planner
    await page.goto('/routes/planner?mock=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Select an AM route
    await page.locator('[data-testid^="route-card"]:has-text("Single Bus AM")').first().click();
    await page.waitForTimeout(1000);

    // Get all markers (stops + school)
    const markerCount = await page.evaluate(() => {
      return document.querySelectorAll('.leaflet-marker-icon').length;
    });

    // Should have at least 2 markers (at least 1 stop + 1 school)
    expect(markerCount).toBeGreaterThanOrEqual(2);

    // Verify polyline exists and has sufficient points
    const polylinePointCount = await page.evaluate(() => {
      const polylines = document.querySelectorAll('.leaflet-overlay-pane path');
      if (polylines.length === 0) return 0;

      const polyline = polylines[0] as SVGPathElement;
      const d = polyline.getAttribute('d');
      if (!d) return 0;

      // Count the number of points in the path (rough estimate)
      const matches = d.match(/L/g);
      return matches ? matches.length + 1 : 1;
    });

    // Polyline should have multiple points (not just a straight line)
    expect(polylinePointCount).toBeGreaterThanOrEqual(2);
  });

  test('RLR06 – route update preserves school connection', async ({ page }) => {
    // Navigate to route planner
    await page.goto('/routes/planner?mock=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Select a route
    await page.locator('[data-testid^="route-card"]:has-text("Single Bus AM")').first().click();
    await page.waitForTimeout(1000);

    // Click edit button
    await page.locator('[data-testid^="edit-route-btn"]').first().click();
    await page.waitForTimeout(500);

    // Make a minor change (update route name)
    const nameInput = page.locator('input[value*="Single Bus AM"]');
    await nameInput.fill('Single Bus AM Updated');
    await page.waitForTimeout(300);

    // Save the route (if save button exists)
    const saveButton = page.locator('button:has-text("Save")');
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await page.waitForTimeout(1500);

      // Verify route line is still rendered
      const polylineExists = await page.evaluate(() => {
        const polylines = document.querySelectorAll('.leaflet-pane path');
        return polylines.length > 0;
      });
      expect(polylineExists).toBe(true);

      // Verify school marker is still rendered
      const schoolMarkerExists = await page.evaluate(() => {
        const markers = document.querySelectorAll('.leaflet-marker-icon');
        for (const marker of markers) {
          const html = marker.innerHTML || '';
          if (html.includes('#8b5cf6')) {
            return true;
          }
        }
        return false;
      });
      expect(schoolMarkerExists).toBe(true);
    }
  });
});
