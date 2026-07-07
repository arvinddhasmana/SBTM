# Test Gap Analysis — Why Tests Passed but Runtime Failed

**Date:** 2026-05-20  
**Branch:** feat/sbtm-refocus-data-model  
**Failures fixed this session:** 502 on `GET /parent/children`, 401 on admin/parent login,
404 on `GET /notification-preferences`, broken alert `eventType` mapping.

---

## Summary

Every failure that surfaced at runtime was invisible to the test suite.
The root cause is a single structural problem: **the test suite validates the
v1 data model while the database was migrated to v2.** All other gaps flow from
this mismatch.

---

## Gap 1 — E2E Tests Are Fully Mocked (Zero Real Backend Coverage)

### What the tests do

All frontend E2E tests (admin, parent web, parent mobile, driver) intercept
every API call and return hardcoded fixture data.

**Parent dashboard** (`apps/parent-dashboard/web/e2e/fixtures.ts`):

- `POST /api/v1/auth/login` → returns mock `{ accessToken: "mock-token" }` directly
- `GET /api/v1/parent/children` → returns `MOCK_CHILDREN` (hardcoded `{ name: "John Doe" }`)
- `GET /api/v1/notification-preferences` → returns `MOCK_PREFS`
- `GET /api/v1/alerts/parent-view/:id` → returns mock alert with `eventType: "PANIC_BUTTON"`

**Admin dashboard** (`apps/admin-dashboard/e2e/fixtures.ts`):

- `loginAs()` does hit the real API for the token, but then injects it into
  localStorage directly — subsequent page-level API calls are NOT mocked, so
  any real endpoint failure would appear as a 401 redirect (which tests filter
  out in `collectConsoleErrors`).

### Why this hid the failures

| Runtime failure                                                      | How tests avoided it                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `GET /parent/children` → 502 (student-service SQL error)             | Mock returned 200 with fake children                                     |
| `GET /notification-preferences` → 404 (route not registered)         | Mock returned 200 with fake prefs                                        |
| Alert `eventType` undefined in dashboard banner                      | Mock injected `eventType: "PANIC_BUTTON"` directly                       |
| Parent login password `Parent123!` (tests never logged in as parent) | Parent auth spec uses `injectSession()` — never calls `POST /auth/login` |

### Fix required

- Add a **real-backend smoke test** layer (separate from the mock E2E) that
  runs against the live stack and asserts at minimum: login 200, children 200
  with non-empty array, notification-preferences 200, absence POST 201.
- Alternatively, add a Playwright config profile `e2e:real` that disables
  `mockApiRoutes` and runs against `http://localhost:3001`.

---

## Gap 2 — Unit Tests Test the Wrong (v1) Implementation

### `parent.gateway.service.spec.ts`

The spec tests the **committed v1 service** which called the student-management
HTTP service and used `School`/`Route` repositories directly.

```typescript
// spec mocks what the v1 service uses:
httpClient.get.mockResolvedValueOnce([{ id: 's1', first_name: 'Alice', last_name: 'Smith', ... }]);
schoolRepo.findBy.mockResolvedValue([...]);
routeRepo.findBy.mockResolvedValue([...]);
```

The actual v2 database has no `first_name`/`last_name` columns in `stx_students`
(they are encrypted bytea columns `legal_name`/`preferred_name`). The spec
never touches the DB, so this mismatch was invisible.

**The spec passed 100% while the real service returned 502.**

### `student.service.spec.ts`

The spec mocks `Repository<Student>` entirely. It never executes a SQL query,
so the fact that the entity declared columns `first_name`, `last_name`,
`parent_user_id`, `am_route_id` — none of which exist in the v2
`stx_students` table — was never caught.

### Fix required

- Specs for `ParentGatewayService` must be rewritten to match the v2 service
  implementation (direct `DataSource.query` calls, no `httpClient` for children,
  PII decryption via `PiiCrypto`).
- `student.service.spec.ts` must mock `DataSource.query` (not just Repository
  methods) to match how `findAll` now works.

---

## Gap 3 — Integration / E2E Tests Use `synchronize: true` with v1 Entity

### `services/student-management/test/student.e2e-spec.ts`

```typescript
TypeOrmModule.forRoot({
  entities: [Student],
  synchronize: true, // ← creates the table from the entity
  dropSchema: true, // ← wipes the DB first
});
```

With the **v1 entity** checked in, this e2e spec:

1. Drops the schema
2. Re-creates `stx_students` with v1 columns (`first_name`, `last_name`, etc.)
3. POSTs `{ first_name: "Jane", last_name: "Smith", ... }` — succeeds
4. All assertions pass

When run against the **real v2 database** (without `synchronize`), the same
POST would fail because:

- The DTO sends `first_name` which the v2 DTO no longer accepts
- The entity maps to columns that don't exist

The test creates its own database reality rather than validating against the
real one.

### Fix required

- Remove `synchronize: true` / `dropSchema: true` from integration tests.
- Run integration tests against a migration-applied test database.
- Update the e2e spec to POST v2-valid payloads (`school_id`, `grade` — no
  `first_name`/`last_name`).

---

## Gap 4 — No Controller-Level Tests for Parent/Notification Routes

There is no test that makes an HTTP request to:

- `GET /api/v1/parent/children` (the endpoint that 502'd)
- `GET /api/v1/notification-preferences` (the endpoint that 404'd)
- `PUT /api/v1/notification-preferences`

The `parent.gateway.service.spec.ts` tests the service class directly — it
never boots a NestJS HTTP server, so route registration, guards, and the full
request pipeline are never exercised.

**A missing `@Get('notification-preferences')` decorator would pass all
existing tests.**

### Fix required

- Add controller-level tests using NestJS `supertest` for:
  - `GET /parent/children` — assert 200 + array
  - `GET /notification-preferences` — assert 200
  - `PUT /notification-preferences` — assert 200/204
- These should use a real (test) database, not mocks.

---

## Gap 5 — Schema Drift Not Detected (No DB Schema Contract Test)

The v2 data model migration renamed/replaced columns across multiple tables:

| Table                 | v1 columns removed                                                        | v2 columns added                                                       |
| --------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `stx_students`        | `first_name`, `last_name`, `parent_user_id`, `am_route_id`, `pm_route_id` | `legal_name` (bytea), `preferred_name` (bytea), `external_ids` (jsonb) |
| `routes`              | `stx_direction_kind` (str)                                                | same, but join column changed                                          |
| `stx_boarding_events` | `route_id → routes.id`                                                    | `route_id → routes.route_id`                                           |

No test in the suite validates that entity column declarations match the live
schema. TypeORM entity decorators are the contract, but they are only validated
at runtime when a query executes.

### Fix required

- Add a **schema contract test** that queries `information_schema.columns` for
  key tables and asserts that every column declared in the entity exists in the
  DB.
- Alternatively, run `typeorm schema:log` in CI and fail the build if there
  are pending migrations.

---

## Gap 6 — Alert `eventType` Mapping Untested in Integration Path

`AlertsGatewayService.getAlertsForRoute` (the `parent-view` endpoint handler)
proxied the raw upstream response without running `mapToAlertDto`. The
upstream response has `category: "safety"` not `eventType: "PANIC_BUTTON"`.

The `alerts.gateway.service.spec.ts` tests `mapToAlertDto` and other methods,
but **not `getAlertsForRoute`** — the one method that skipped the mapping.

The parent dashboard E2E mocked the alert with `eventType` pre-filled, so the
broken mapping was never seen in tests.

### Fix required

- Add a unit test for `getAlertsForRoute` that asserts the response contains
  `eventType` (mapped from `category`).

---

## Root Cause Summary

| #   | Root Cause                                                       | Failures Hidden                                                     |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Frontend E2E tests 100% mocked — never call real API             | 502 on children, 404 on preferences, broken alert banner            |
| 2   | Unit tests mock the v1 implementation, not v2                    | `parent.gateway.service` and `student.service` pass with wrong code |
| 3   | Integration e2e uses `synchronize:true` to self-create v1 schema | Student CRUD passes in isolation, fails against real v2 DB          |
| 4   | No HTTP-level controller tests                                   | Missing routes register as 404 undetected                           |
| 5   | No schema contract enforcement                                   | Entity/DB column drift undetected until first runtime query         |
| 6   | `getAlertsForRoute` excluded from spec coverage                  | Raw upstream field leaks to frontend                                |

---

## Remediation Plan

### P0 — Immediate (fixes the leaking floor)

1. **Rewrite `parent.gateway.service.spec.ts`** to test the v2 implementation:
   mock `DataSource.query` sequences (guardians → studentLinks → studentRows →
   schools → ridership → boarding events), not `httpClient.get`.

2. **Rewrite `student.service.spec.ts`** to mock `manager.query` for the
   `stx_student_guardians` join used in `findAll`.

3. **Fix `student.e2e-spec.ts`**: remove `synchronize: true`, run against a
   migration-applied DB, update POST payload to v2 fields.

4. **Add `getAlertsForRoute` unit test** asserting `eventType` is mapped from
   `category`.

### P1 — Short Term (adds missing coverage layer)

5. **Add controller smoke tests** (supertest against real DB) for:
   - `GET /parent/children` (200, non-empty)
   - `GET/PUT /notification-preferences` (200)
   - `POST /absences` (201)

6. **Add a real-backend E2E profile** in Playwright config that disables all
   mocks and runs a minimal happy-path suite against the live hybrid stack.

### P2 — Process (prevents future drift)

7. **Add schema contract test**: on every CI run, query `information_schema`
   and assert entity columns exist in the live DB. Fail the build on drift.

8. **Enforce `synchronize: false` in all test environments** via a shared
   TypeORM test config. Only use a migration-applied test DB.

9. **Treat mock fixtures as living contracts**: when a backend DTO changes
   (field rename, new required field), the corresponding E2E mock fixture must
   be updated in the same PR. Add a linting rule or PR checklist item.
