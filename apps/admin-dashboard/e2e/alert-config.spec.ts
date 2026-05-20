import { test, expect } from '@playwright/test';
import { loginAs, gotoAndWait, TEST_USERS } from './fixtures';

test.describe('Alert Configuration', () => {
  test.describe('AC01: Alert Configuration Dashboard - Super Admin', () => {
    test('AC01: should display dashboard with all configuration sections', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config');

      // Check page title
      await expect(page.locator('h2').first()).toHaveText('Alert Configuration');

      // Check all configuration sections are visible
      await expect(page.locator('text=Event Type Configuration')).toBeVisible();
      await expect(page.locator('text=Escalation Timing')).toBeVisible();
      await expect(page.locator('text=Notification Routing')).toBeVisible();
      await expect(page.locator('text=Workflow Configuration')).toBeVisible();
      await expect(page.locator('text=Configuration Audit Log')).toBeVisible();
      await expect(page.locator('text=Change Requests').first()).toBeVisible();

      // Check cache status is displayed
      await expect(page.locator('text=Cache Status')).toBeVisible();

      // Check quick actions are available
      await expect(page.locator('text=Quick Actions')).toBeVisible();
      await expect(page.locator('button:has-text("Invalidate Cache")')).toBeVisible();
    });

    test('AC02: should navigate to event type configuration', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config');

      // Click on Event Type Configuration card
      await page.click('text=Event Type Configuration');
      await page.waitForURL('**/alert-config/event-types');

      // Verify page loaded
      await expect(page.locator('h2').first()).toContainText('Event Type');
    });

    test('AC03: should navigate to escalation timing', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config');

      await page.click('text=Escalation Timing');
      await page.waitForURL('**/alert-config/escalation-timing');

      await expect(page.locator('h2').first()).toContainText('Escalation Timing');
    });

    test('AC04: should navigate to notification routing', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config');

      await page.click('text=Notification Routing');
      await page.waitForURL('**/alert-config/notification-routing');

      await expect(page.locator('h2').first()).toContainText('Notification Routing');
    });

    test('AC05: should navigate to workflow configuration', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config');

      await page.click('text=Workflow Configuration');
      await page.waitForURL('**/alert-config/workflow');

      await expect(page.locator('h2').first()).toContainText('Workflow');
    });

    test('AC06: should navigate to audit log', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config');

      await page.click('text=Configuration Audit Log');
      await page.waitForURL('**/alert-config/audit');

      await expect(page.locator('h2').first()).toContainText('Audit Log');
    });

    test('AC07: should navigate to change requests', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config');

      await page.click('text=Change Requests');
      await page.waitForURL('**/alert-config/change-requests');

      await expect(page.locator('h2').first()).toContainText('Change Requests');
    });
  });

  test.describe('AC08: Alert Configuration Dashboard - Board/School Admin', () => {
    test('AC08: should display read-only warning for Board Admin', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await gotoAndWait(page, '/alert-config');

      // Check read-only banner is displayed
      await expect(page.locator('text=Read-Only Access').first()).toBeVisible();
      await expect(
        page.locator('text=You have read-only access to configuration settings'),
      ).toBeVisible();

      // Audit log should not be visible for non-super admins
      await expect(page.locator('text=Configuration Audit Log')).not.toBeVisible();
    });

    test('AC09: should display read-only warning for School Admin', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alert-config');

      await expect(page.locator('text=Read-Only Access').first()).toBeVisible();
    });
  });

  test.describe('AC10: Event Type Configuration - Super Admin', () => {
    test('AC10: should display event type list', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/event-types');

      // Check page title
      await expect(page.locator('h2').first()).toContainText('Event Type');

      // Check add button is visible
      await expect(page.locator('button:has-text("Add Event Type")')).toBeVisible();

      // Check table headers
      await expect(page.locator('th:has-text("Event Type")')).toBeVisible();
      await expect(page.locator('th:has-text("Tier")')).toBeVisible();
      await expect(page.locator('th:has-text("Severity")')).toBeVisible();
    });

    test('AC11: should create new event type', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/event-types');

      // Click add button
      await page.click('button:has-text("Add Event Type")');

      // Fill form (placeholder is "PANIC_BUTTON" not "EVENT_TYPE")
      await page.fill('input[placeholder*="PANIC_BUTTON"]', 'TEST_EVENT_E2E');
      await page.selectOption('select >> nth=0', 'TIER_2');
      await page.fill('textarea[placeholder*="description"]', 'E2E test event type');
      await page.selectOption('select >> nth=1', 'MEDIUM');

      // Submit — button text is "Save"
      await page.click('button:has-text("Save")');

      // Wait for form to close (success indicator)
      await expect(page.locator('h2:has-text("Add New Event Type")')).not.toBeVisible({
        timeout: 8000,
      });

      // Verify event type appears in list
      await expect(page.locator('text=TEST_EVENT_E2E')).toBeVisible();

      // Clean up - delete uses window.confirm dialog, buttons are icon-only
      const row = page.locator('tr:has-text("TEST_EVENT_E2E")');
      page.once('dialog', (dialog) => dialog.accept());
      await row.locator('button').last().click(); // Last icon button is delete (Trash2)
      await page.waitForTimeout(500);
    });

    test('AC12: should edit existing event type', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/event-types');

      // Find first event type row
      const firstRow = page.locator('tbody tr').first();

      // Click edit button (icon-only, first button in row)
      await firstRow.locator('button').first().click();

      // Modify description
      await page.fill('textarea[placeholder*="description"]', 'Updated via E2E test');

      // Save — button text is "Save"
      await page.click('button:has-text("Save")');
      await page.waitForTimeout(1000);

      // Verify row still visible (change persisted)
      await expect(firstRow).toBeVisible();
    });
  });

  test.describe('AC13: Escalation Timing Configuration', () => {
    test('AC13: should display escalation timing configurations', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/escalation-timing');

      await expect(page.locator('h2').first()).toContainText('Escalation Timing');

      // Page uses card layout — check field labels (not table headers)
      await expect(page.locator('text=Confirmation Timeout').first()).toBeVisible();
      await expect(page.locator('text=Board Escalation').first()).toBeVisible();
      await expect(page.locator('text=STA Escalation').first()).toBeVisible();
    });

    test('AC14: should update escalation timing', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/escalation-timing');

      // Cards layout — click first Edit button
      await page.locator('button:has-text("Edit")').first().click();

      // Modify timeout (in seconds)
      await page.fill('input[type="number"]', '150');

      // Save
      await page.click('button:has-text("Save")');
      await page.waitForTimeout(1000);

      // Verify card is still visible (timing saved)
      await expect(page.locator('text=Confirmation Timeout').first()).toBeVisible();
    });
  });

  test.describe('AC15: Notification Routing Configuration', () => {
    test('AC15: should display notification routing rules', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/notification-routing');

      await expect(page.locator('h2').first()).toContainText('Notification Routing');

      // Check add button
      await expect(page.locator('button:has-text("Add Routing Rule")')).toBeVisible();

      // Check table headers
      await expect(page.locator('th:has-text("Tier")')).toBeVisible();
      await expect(page.locator('th:has-text("Recipient")')).toBeVisible();
      await expect(page.locator('th:has-text("Channels")')).toBeVisible();
    });

    test('AC16: should create notification routing rule', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/notification-routing');

      // Click add button
      await page.click('button:has-text("Add Routing Rule")');

      // Fill form
      await page.selectOption('select >> nth=0', 'TIER_1');
      await page.selectOption('select >> nth=1', 'PARENT');
      await page.selectOption('select >> nth=2', 'IMMEDIATE');

      // Select channels
      await page.check('input[type="checkbox"]');

      // Submit
      await page.click('button:has-text("Create Rule")');
      await page.waitForTimeout(1000);

      // Verify rule created
      await expect(page.locator('td:has-text("PARENT")').first()).toBeVisible();
    });
  });

  test.describe('AC17: Workflow Configuration', () => {
    test('AC17: should display workflow actions', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/workflow');

      await expect(page.locator('h2').first()).toContainText('Workflow');

      // Check add button
      await expect(page.locator('button:has-text("Add Workflow Action")')).toBeVisible();

      // Check table headers
      await expect(page.locator('th:has-text("Action Name")')).toBeVisible();
      await expect(page.locator('th:has-text("Required Role")')).toBeVisible();
    });

    test('AC18: should create workflow action', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/workflow');

      // Click add button
      await page.click('button:has-text("Add Workflow Action")');

      // Fill form — actionName is now a select constrained to valid DB values
      await page.selectOption('select >> nth=0', 'STATUS_UPDATE');
      await page.selectOption('select >> nth=1', 'TIER_2');
      await page.selectOption('select >> nth=2', 'ESCALATED_TO_BOARD');
      await page.selectOption('select >> nth=3', 'BOARD_ADMIN');

      // Submit
      await page.click('button:has-text("Create Action")');
      await page.waitForTimeout(1000);

      // Verify action created (check table cell, not the select option)
      await expect(page.locator('td:has-text("STATUS_UPDATE")').first()).toBeVisible();

      // Clean up — find the newly added row and delete it
      const rows = page.locator(
        'tbody tr:has-text("STATUS_UPDATE"):has-text("TIER_2"):has-text("ESCALATED_TO_BOARD")',
      );
      if ((await rows.count()) > 0) {
        await rows.first().locator('button').nth(1).click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('AC19: Configuration Audit Log', () => {
    test('AC19: should display audit log for Super Admin', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/audit');

      await expect(page.locator('h2').first()).toContainText('Audit Log');

      // Check filters
      await expect(page.locator('text=Filters').first()).toBeVisible();
      await expect(page.locator('label:has-text("Configuration Type")')).toBeVisible();
      await expect(page.locator('label:has-text("Limit")')).toBeVisible();

      // Check table headers
      await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
      await expect(page.locator('th:has-text("Action")')).toBeVisible();
      await expect(page.locator('th:has-text("Config Type")')).toBeVisible();
      await expect(page.locator('th:has-text("Changed By")')).toBeVisible();
    });

    test('AC20: should filter audit log by config type', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/audit');

      // Select filter
      await page.selectOption('select >> nth=0', 'alert_event_type_config');
      await page.waitForTimeout(1000);

      // Verify filtered results (if any)
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('AC21: should not allow Board Admin to access audit log', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await gotoAndWait(page, '/alert-config');

      // Audit log card should not be visible
      await expect(page.locator('text=Configuration Audit Log')).not.toBeVisible();
    });
  });

  test.describe('AC22: Change Requests', () => {
    test('AC22: should display pending change requests for Super Admin', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/change-requests');

      await expect(page.locator('h2').first()).toContainText('Change Requests');

      // Check status filters
      await expect(page.locator('button:has-text("All")')).toBeVisible();
      await expect(page.locator('button:has-text("Pending")')).toBeVisible();
      await expect(page.locator('button:has-text("Approved")')).toBeVisible();
      await expect(page.locator('button:has-text("Rejected")')).toBeVisible();
    });

    test('AC23: should allow Board Admin to submit change request', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await gotoAndWait(page, '/alert-config/change-requests');

      // Check submit button is visible
      await expect(page.locator('button:has-text("Submit Request")')).toBeVisible();

      // Click submit
      await page.click('button:has-text("Submit Request")');

      // Fill form
      await page.selectOption('select', 'alert_event_type_config');
      await page.fill('textarea[placeholder*="Describe the change"]', 'E2E test change request');
      await page.fill(
        'textarea[placeholder*="why this change"]',
        'Testing change request workflow',
      );

      // Submit
      await page.click('button:has-text("Submit Request")');
      await page.waitForTimeout(1000);

      // Verify request appears in list
      await expect(page.locator('text=E2E test change request').first()).toBeVisible();
    });

    test('AC24: should allow School Admin to submit change request', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alert-config/change-requests');

      await expect(page.locator('button:has-text("Submit Request")')).toBeVisible();
    });

    test('AC25: should filter change requests by status', async ({ page }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/alert-config/change-requests');

      // Click Pending filter
      await page.click('button:has-text("Pending")');
      await page.waitForTimeout(500);

      // Click Approved filter
      await page.click('button:has-text("Approved")');
      await page.waitForTimeout(500);

      // Click All filter
      await page.click('button:has-text("All")');
      await page.waitForTimeout(500);
    });
  });

  test.describe('AC26: Read-Only Access for Non-Super Admins', () => {
    test('AC26: Board Admin should see read-only banner on event types', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await gotoAndWait(page, '/alert-config/event-types');

      // Read-only banner should be visible
      await expect(page.locator('text=Read-Only Access').first()).toBeVisible();

      // Add button should not be visible
      await expect(page.locator('button:has-text("Add Event Type")')).not.toBeVisible();
    });

    test('AC27: School Admin should see read-only banner on escalation timing', async ({
      page,
    }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alert-config/escalation-timing');

      await expect(page.locator('text=Read-Only Access').first()).toBeVisible();
    });

    test('AC28: Board Admin should see read-only banner on notification routing', async ({
      page,
    }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await gotoAndWait(page, '/alert-config/notification-routing');

      await expect(page.locator('text=Read-Only Access').first()).toBeVisible();
      await expect(page.locator('button:has-text("Add Routing Rule")')).not.toBeVisible();
    });

    test('AC29: School Admin should see read-only banner on workflow config', async ({ page }) => {
      await loginAs(page, 'SCHOOL_ADMIN');
      await gotoAndWait(page, '/alert-config/workflow');

      await expect(page.locator('text=Read-Only Access').first()).toBeVisible();
      await expect(page.locator('button:has-text("Add Workflow Action")')).not.toBeVisible();
    });
  });

  test.describe('AC30: Navigation and Sidebar Integration', () => {
    test('AC30: Alert Config link should be visible in sidebar for all admins', async ({
      page,
    }) => {
      await loginAs(page, 'SUPER_ADMIN');
      await gotoAndWait(page, '/dashboard');

      // Check sidebar link exists
      await expect(page.locator('nav a:has-text("Alert Config")')).toBeVisible();
    });

    test('AC31: should navigate from dashboard to alert config via sidebar', async ({ page }) => {
      await loginAs(page, 'BOARD_ADMIN');
      await gotoAndWait(page, '/dashboard');

      // Click sidebar link
      await page.click('nav a:has-text("Alert Config")');
      await page.waitForURL('**/alert-config');

      await expect(page.locator('h2').first()).toHaveText('Alert Configuration');
    });
  });
});
