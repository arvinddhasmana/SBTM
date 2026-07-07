# E2E Test Gap Analysis

## Why browser UI tests passed while Admin and Parent portals had real authentication and data failures

**Date:** 2026-05-20  
**Branch:** feat/sbtm-refocus-data-model  
**Compared:** Working directory (v2 changes) vs HEAD (last checked-in code)

---

## Executive Summary

The browser E2E tests (Playwright) passed in full, but both portals broke in practice.
The root cause is not a test assertion error — the tests were architecturally incapable of
detecting the failures that occurred. This document enumerates six specific gaps and a
resolution plan.

---

## What Actually Failed in Production

| Portal         | Symptom                                    | Actual Error                                                                                                              |
| -------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Parent portal  | "Authentication failing" / blank dashboard | `GET /parent/children` → 502; student-management service querying columns that no longer exist in `stx_students`          |
| Admin portal   | 403 on Absences page                       | `SUPER_ADMIN` missing from `@Roles` on `GET /absences` and `GET /absences/admin`                                          |
| Admin portal   | Routes page JavaScript crash               | `route.stops.length` where `stops` is `undefined` after v2 GTFS migration                                                 |
| Admin portal   | ETA display shows "NaN min"                | `formatEta(undefined)` — no null guard before the `< 1` comparison                                                        |
| Admin + Parent | Alert banner empty after panic button      | `getAlertsForRoute` returned raw v2 upstream object; frontend expected `eventType` field which didn't exist in raw object |

---

## Gap 1 — Parent Portal E2E: 100% mocked APIs hide all backend failures

### Evidence

`apps/parent-dashboard/web/e2e/fixtures.ts`:

```typescript
export async function mockApiRoutes(page: Page, overrides = {}): Promise<void> {
  await page.route(`${API}/api/v1/auth/login`, (route) => route.fulfill({ status: 200, json: { accessToken: 'mock-jwt-token', ... } }));
  await page.route(`${API}/api/v1/auth/me`, (route) => route.fulfill({ status: 200, json: { role: 'PARENT' } }));
  await page.route(`${API}/api/v1/parent/children`, (route) => route.fulfill({ status: 200, json: children }));
  await page.route(`${API}/api/v1/notification-preferences`, ...);
  // ... every API endpoint is intercepted
}
```

Every single test in `apps/parent-dashboard/web/e2e/` calls `await mockApiRoutes(page)` before interacting with the page. The Playwright network interceptor silently substitutes a fixed 200 OK response for every backend call. If the real API gateway returns 502, 401, or a malformed payload, the tests never see it.

### Root Cause

The parent portal E2E suite was written as pure UI/component tests with full network mocking. This is valid for testing UI rendering in isolation, but it provides zero coverage of backend connectivity, schema compatibility, or API response shape.

### What the tests proved vs what they didn't

- **Proved:** Login form renders, redirect logic works, localStorage is set, UI transitions render.
- **Did not prove:** Real backend accepts the JWT, `/parent/children` returns data the frontend can consume, student-management service is healthy.

---

## Gap 2 — Admin Portal E2E: `loginAs` fixture silently swallows real auth failures

### Evidence

`apps/admin-dashboard/e2e/fixtures.ts`:

```typescript
export async function loginAs(page: Page, role: TestRole): Promise<void> {
  const loginRes = await page.request.post(`${E2E_API_URL}/api/v1/auth/login`, {
    data: { email: TEST_USERS[role].email, password },
  });
  try {
    const body = await loginRes.json();
    if (body.accessToken) {
      await page.evaluate((token) => localStorage.setItem('auth_token', token), body.accessToken);
    }
  } catch {
    /* ignore – cookie-only auth is still attempted */
  }

  // Unconditionally inject hardcoded localStorage:
  await page.evaluate(
    (user) => localStorage.setItem('auth_user', JSON.stringify(user)),
    TEST_USERS[role],
  );
  await page.goto('/dashboard', { waitUntil: 'load' }).catch(() => {});
}
```

The fixture:

1. Makes a real login POST — but if it fails (wrong password, user not in DB, DB down), the error is caught and **silently ignored**.
2. **Always** injects hardcoded `TEST_USERS[role]` into localStorage regardless of whether the real backend authenticated.
3. If the backend cookie was not set (because login failed), all subsequent API calls return 401, but tests that only assert on URL (`toHaveURL(/\/dashboard/)`) still pass.

### Root Cause

The hardcoded localStorage injection decouples the test's "is the user authenticated?" check from the backend's "did authentication actually succeed?" answer. The SPA's `AuthContext` reads `auth_user` from localStorage and marks the user as authenticated — it never validates this against the backend until an API call fails. Navigation tests pass; data tests would fail but they weren't written.

---

## Gap 3 — E2E auth tests only verify navigation/routing, not authenticated data fetching

### Evidence

All auth test assertions in both portals follow this pattern:

```typescript
// Admin auth.spec.ts
await expect(page).toHaveURL(/\/dashboard/);
// or:
await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
```

Not a single auth test asserts that a real API call succeeded after login. Tests AT09–AT12 (session persistence) only check the URL after navigation.

### Root Cause

Authentication and authorisation are two distinct concerns. The tests proved that:

- The login form navigates the browser to `/dashboard` ✓
- The SPA's route guard redirects unauthenticated users ✓

But they did not prove:

- The backend JWT was valid and accepted by API endpoints ✗
- The `GET /parent/children` call succeeds and returns children ✗
- The `GET /dashboard` data loads without runtime errors ✗

A user "authenticated but broken portal" scenario (valid JWT, broken data endpoint) is completely invisible to the test suite.

---

## Gap 4 — v1 `Student` entity queries columns removed in v2 schema

### Evidence

`HEAD` `services/student-management/src/modules/student/entities/student.entity.ts`:

```typescript
@Entity('stx_students')
export class Student {
  @Column() first_name: string;        // REMOVED in v2 migration
  @Column() last_name: string;         // REMOVED
  @Column({ type: 'uuid', nullable: true }) parent_user_id: string;  // REMOVED
  @Column({ type: 'uuid', nullable: true }) am_route_id: string;     // REMOVED
  ...
}
```

`Working directory` `student.service.ts` v1 `findAll` (HEAD code, still in effect):

```typescript
qb.andWhere('student.parent_user_id = :parent_id', { parent_id: query.parent_id });
```

The v2 database migration removed `parent_user_id`, `first_name`, `last_name`, `am_route_id`, `pm_route_id` from `stx_students`. The HEAD student-management service entity still declares these columns. With `synchronize: false`, TypeORM generates SQL referencing them. PostgreSQL returns: `column "parent_user_id" does not exist`. The api-gateway's parent service gets a 500, and `GET /parent/children` returns nothing.

This is the primary cause of the parent portal appearing broken post-login — the session was valid, but every data request crashed at the ORM layer.

### Why E2E missed it

- Parent portal tests: fully mocked — never hit the real student service.
- `services/student-management/test/student.e2e-spec.ts` ran with `synchronize: true` (HEAD) or hit a test DB that hadn't been migrated, so the old columns existed in the test DB even though production had them removed.

---

## Gap 5 — `SUPER_ADMIN` missing from `@Roles` on absence endpoints

### Evidence

`HEAD` `services/api-gateway/src/modules/gateway/controllers/absence.controller.ts`:

```typescript
@Get()
@Roles(Role.DRIVER, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN, Role.STA_ADMIN)  // no SUPER_ADMIN
async listAbsences(...) {}

@Get('admin')
@Roles(Role.SCHOOL_ADMIN, Role.BOARD_ADMIN, Role.STA_ADMIN)  // no SUPER_ADMIN
async adminAbsences(...) {}
```

A `SUPER_ADMIN` user who logs in and navigates to the Absences page triggers `GET /absences/admin` — the `RolesGuard` returns 403. The admin portal shows an error instead of absence data.

### Why E2E missed it

`apps/admin-dashboard/e2e/absences.spec.ts` either:

- Used `SCHOOL_ADMIN` or `STA_ADMIN` as the test role (which do have the permission), OR
- Used `loginAs(page, 'SUPER_ADMIN')` but then the fixture's silent-failure pattern let the test continue to a URL check rather than asserting on the absence list

The admin auth tests use `SUPER_ADMIN` for session persistence (AT09) but navigate only to `/dashboard`, never to `/absences`.

---

## Gap 6 — Frontend `route.stops.length` crash and `formatEta(undefined)` crash never exercised

### Evidence

Working directory fixes:

```typescript
// RouteCard.tsx: was route.stops.length, now:
<span>{t('routes:routeCard.stops', { count: route.stops?.length ?? 0 })}</span>

// formatters.ts: was unguarded, now:
export function formatEta(minutes: number | undefined | null): string {
  if (minutes == null || isNaN(minutes)) return '—';
```

The v2 `toFrontendRoute` mapper (added in working directory) returns `stops: []` always. But the HEAD `route.controller.ts` returned raw GTFS `Route` entities which have no `stops` array — the `stops` property was `undefined`. The `RouteCard` component crashed on first render with `TypeError: Cannot read properties of undefined (reading 'length')`.

### Why E2E missed it

`apps/admin-dashboard/e2e/route-planner.spec.ts` and `route-planner-live.spec.ts` assert on route names, GPS markers, and form fields — not on the stop-count badge rendered by `RouteCard`. The component crash would have been caught as a page-error console log, but the `collectConsoleErrors` helper is not called in route tests.

---

## Summary: Why Tests Passed Despite Real Failures

| Failure                                    | Why E2E didn't catch it                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `/parent/children` → 500 (bad column name) | Parent portal: all APIs mocked, real network never reached                                          |
| SUPER_ADMIN 403 on absences                | Admin fixture navigates to `/dashboard` not `/absences`; role used for that page had the permission |
| `route.stops.length` crash                 | E2E doesn't render RouteCards with real data; no `pageerror` assertion in route tests               |
| `formatEta(undefined)` renders "NaN min"   | ETA UI element not asserted on in any E2E test                                                      |
| Alert banner missing `eventType`           | Parent portal mocked; admin alert tests mock upstream responses in v1 shape                         |
| Entity columns out of sync with DB schema  | Student e2e used `synchronize: true` against test DB — test DB had old schema                       |

---

## Resolution Plan

### P0 — Schema contract: align entity with DB (blocks everything)

**Owner:** backend  
**Files:** `services/student-management/src/modules/student/entities/student.entity.ts`

The HEAD entity must match the v2 database schema. The working-directory version already does this. **Commit the working-directory changes for student entity, DTO, service, and controller** — this unblocks both the student service and the parent portal.

Specifically commit:

- `student.entity.ts` — remove v1 PII/route columns, add v2 PII bytea + jsonb columns
- `student.service.ts` — replace `parent_user_id` query with guardian join
- `student.dto.ts` — remove v1 fields
- `student.controller.ts` — remove `assignRoute`, `bulkImport` (v1 endpoints)

### P1 — Fix SUPER_ADMIN 403 on absences (immediate data loss for admins)

**Owner:** backend  
**Files:** `services/api-gateway/src/modules/gateway/controllers/absence.controller.ts`

Commit the working-directory change that adds `Role.SUPER_ADMIN` to `@Roles` on `GET /absences` and `GET /absences/admin`, and the matching `absence.gateway.service.ts` fix that handles `anchorKind: 'super'`.

### P2 — Commit all remaining v2 backend fixes

**Owner:** backend  
The following working-directory changes fix real runtime issues and must be committed:

- `parent.gateway.service.ts` — replace HTTP→student-service with direct `DataSource.query` chain; add PII_CRYPTO decryption; fix boarding events join (`stx_direction_kind` column, `routes.route_id` FK)
- `alerts.gateway.service.ts` — add `mapToAlertDto` (v2→v1 field mapping); fix `getAlertsForRoute` to include `eventType`; add `getRawAlertById`
- `alerts.controller.ts` — add `@InjectRepository(Board)`; fix `assertAlertOwnership` to use `staId`
- `notification-settings.gateway.service.ts` + controller — add `GET/PUT /notification-preferences` backed by `system_settings` table
- `fleet.controller.ts` + `fleet.service.ts` — allow SUPER_ADMIN/STA_ADMIN to list all vehicles without `operatorId`
- `route.controller.ts` — add `toFrontendRoute` mapper so frontend never receives a raw GTFS entity

### P3 — Frontend null-safety fixes

**Owner:** frontend  
Commit:

- `RouteCard.tsx` — `route.stops?.length ?? 0` (prevents crash when stops undefined)
- `formatters.ts` — null guard in `formatEta`

### P4 — Fix parent portal E2E: add a real-backend smoke test (no mocks)

**Owner:** QA/testing  
**File:** `apps/parent-dashboard/web/e2e/auth-real-backend.spec.ts` (new file)

Create a separate Playwright config profile (`playwright.real.config.ts`) that sets `use.serviceWorkers: 'allow'` and does NOT call `mockApiRoutes`. Write one test per critical path:

```typescript
test('real backend: login → /parent/children returns data', async ({ page }) => {
  // Real POST /api/v1/auth/login — no mocking
  await page.goto('/login');
  await page.locator('input[id="email"]').fill('parent1.stbern@sbtm.demo');
  await page.locator('input[id="password"]').fill('Admin123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard');
  // Assert actual children data loaded — no mock
  await expect(page.locator('[data-testid="child-card"]').first()).toBeVisible({ timeout: 10_000 });
});
```

This must be run in the `test:e2e:real` CI step (with services up) rather than the mock-safe `test:e2e` step.

### P5 — Fix admin portal E2E: make `loginAs` fail loudly on auth errors

**Owner:** QA/testing  
**File:** `apps/admin-dashboard/e2e/fixtures.ts`

Replace the silent swallow with an assertion:

```typescript
// Replace:
} catch { /* ignore – cookie-only auth is still attempted */ }

// With:
const body = await loginRes.json();
if (!loginRes.ok()) {
  throw new Error(`loginAs(${role}) failed: ${loginRes.status()} ${JSON.stringify(body)}`);
}
if (body.accessToken) {
  await page.evaluate((token) => localStorage.setItem('auth_token', token), body.accessToken);
}
```

Also add a session validation check at the start of every `test.beforeEach` for data-dependent tests:

```typescript
test.beforeEach(async ({ page }) => {
  await loginAs(page, 'SUPER_ADMIN');
  // Verify a real API call succeeds before running the test body:
  const res = await page.request.get(`${E2E_API_URL}/api/v1/auth/me`, { headers: ... });
  expect(res.ok()).toBe(true);
});
```

### P6 — Add runtime assertions in admin E2E for broken data pages

**Owner:** QA/testing  
Currently no admin E2E test navigates to `/absences` as SUPER_ADMIN and checks that data loads. Add:

```typescript
test('SUPER_ADMIN can view absences list', async ({ page }) => {
  await loginAs(page, 'SUPER_ADMIN');
  await page.goto('/absences');
  // Assert absence table renders, not a 403 error
  await expect(page.locator('[data-testid="absence-table"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('text=403')).not.toBeVisible();
});
```

Similarly for routes (check that RouteCards render without crashing), and vehicle ETA (check no "NaN" text visible).

### P7 — Enforce `synchronize: false` in student-management e2e

**Owner:** QA/testing  
`services/student-management/test/student.e2e-spec.ts` currently used `synchronize: true`. The working directory already changes this to `synchronize: false`. This must stay false so the e2e test database must be migrated like production — the test will now fail if entity and schema diverge, catching Gap 4 class bugs early.

---

## Checklist

- [ ] P0: Commit student entity v2 (unblocks parent portal)
- [ ] P1: Commit absence controller SUPER_ADMIN fix
- [ ] P2: Commit all remaining api-gateway v2 service/controller changes
- [ ] P3: Commit frontend null-safety fixes (RouteCard, formatters)
- [ ] P4: Add real-backend E2E smoke test for parent portal (no mockApiRoutes)
- [ ] P5: Harden admin `loginAs` fixture to fail on auth error
- [ ] P6: Add data-page assertions to admin E2E (absences, routes, vehicles)
- [ ] P7: Keep `synchronize: false` in student-management e2e (already done in working dir)
