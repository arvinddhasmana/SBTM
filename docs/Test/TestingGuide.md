# SBTM Testing Guide

- Document owner: QA and Engineering
- Last reviewed: 2026-04-07
- Primary use: Test pyramid, operational verification, smoke checks, and test scenario index

This guide is the testing reference for the SBTM platform. It covers test layers, coverage targets, scenario indices, and operational verification procedures.

## Related Documents

- [GapAnalysis.md](../prd/v1/GapAnalysis.md)
- [UpgradePlan.md](../prd/v1/UpgradePlan.md)
- [Requirements.md](../Business/Requirements.md)
- [DEMO_SETUP_GUIDE.md](../Demo/DEMO_SETUP_GUIDE.md)

---

## 1. Test Pyramid

| Layer                   | Location                                | Infrastructure                    | Coverage Target             |
| ----------------------- | --------------------------------------- | --------------------------------- | --------------------------- |
| **Unit Tests**          | `services/*/src/**/*.spec.ts`           | None (Jest mocks)                 | 80%+ (90%+ for guards/auth) |
| **Integration Tests**   | `services/*/test/*.e2e-spec.ts`         | Docker Compose (Postgres + Redis) | Scenario-complete           |
| **API Smoke Tests**     | `scripts/verify-demo.sh`                | Full Docker stack                 | All critical paths          |
| **E2E Tests**           | `apps/admin-dashboard/e2e/`             | Playwright + full stack           | Critical user flows         |
| **Frontend Unit Tests** | `apps/admin-dashboard/src/**/*.test.ts` | Vitest                            | 80%+                        |

---

## 2. Repository Test Layout

```
SBTM/
├── services/
│   ├── api-gateway/
│   │   ├── src/**/*.spec.ts          # Unit tests per module
│   │   └── test/*.e2e-spec.ts        # Integration tests
│   ├── gps-tracking/
│   │   ├── src/**/*.spec.ts
│   │   └── test/*.e2e-spec.ts
│   ├── emergency-alerts/
│   │   ├── src/**/*.spec.ts
│   │   └── test/*.e2e-spec.ts
│   ├── student-presence/
│   │   ├── src/**/*.spec.ts
│   │   └── test/*.e2e-spec.ts
│   ├── video-service/
│   │   ├── src/**/*.spec.ts
│   │   └── test/*.e2e-spec.ts
│   ├── student-management/
│   │   ├── src/**/*.spec.ts
│   │   └── test/*.e2e-spec.ts
│   └── compliance-management/
│       ├── src/**/*.spec.ts
│       └── test/*.e2e-spec.ts
├── apps/
│   ├── admin-dashboard/
│   │   ├── src/**/*.test.ts         # Vitest frontend unit tests
│   │   └── e2e/                     # Playwright E2E browser UI tests
│   │       ├── auth.spec.ts         # Authentication flows (AT01–AT12)
│   │       ├── sidebar-navigation.spec.ts  # Role-based nav (SN01–SN18)
│   │       ├── route-guards.spec.ts # URL access enforcement (RG01–RG16)
│   │       ├── compliance.spec.ts   # Compliance page (CP01–CP16)
│   │       ├── students.spec.ts     # Students page (STU01–STU12)
│   │       ├── fleet-assignments.spec.ts   # Fleet & assignments (FA01–FA10)
│   │       ├── fixtures.ts          # Shared loginAs helper, TEST_USERS, roles
│   │       └── playwright.config.ts # Playwright config (baseURL, browser, retries)
│   └── driver-app/src/**/*.test.ts  # Jest React Native tests
├── scripts/
│   ├── verify-demo.sh                    # API smoke test suite
│   └── simulate-demo.sh                  # GPS + events simulation
└── docker-compose.ci.yml                 # CI build (admin-dashboard only; not full test infra)
```

---

## 3. Coverage Requirements

| Component Type                         | Line Coverage | Notes               |
| -------------------------------------- | ------------- | ------------------- |
| Auth guards and RBAC logic             | 90%+          | Security-critical   |
| Tenant isolation (school_id filtering) | 90%+          | Privacy-critical    |
| Service controllers and handlers       | 85%+          | Core business logic |
| DTO validation and transforms          | 80%+          | Input boundary      |
| Queue producers / consumers            | 80%+          | Async pathways      |
| Frontend components                    | 80%+          | User-facing         |
| Configuration / startup                | 75%+          | Bootstrap code      |
| **Global minimum**                     | **80%**       | CI gate             |

---

## 4. Test Scenario Index

### Unit Tests (UT01–UT12)

| ID   | Service               | Validates                                                                      |
| ---- | --------------------- | ------------------------------------------------------------------------------ |
| UT01 | api-gateway           | JWT validation, token expiry, malformed tokens                                 |
| UT02 | api-gateway           | RBAC role-based access (OSTA_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN, DRIVER, PARENT) |
| UT03 | api-gateway           | Tenant guard: school_id isolation                                              |
| UT04 | gps-tracking          | Location point creation and validation                                         |
| UT05 | gps-tracking          | Route live-location query scoping                                              |
| UT06 | emergency-alerts      | Alert creation, event type validation (PANIC_BUTTON, OTHER)                    |
| UT07 | emergency-alerts      | Queue producer enqueue behavior                                                |
| UT08 | student-presence      | Presence event creation and deduplication                                      |
| UT09 | student-presence      | Event type validation (BOARD, ALIGHT)                                          |
| UT10 | student-management    | Student CRUD with school_id filtering                                          |
| UT11 | video-service         | Video event creation and metadata validation                                   |
| UT12 | compliance-management | Audit log entry creation                                                       |

### Integration Tests (IT01–IT08)

| ID   | Service(s)                       | Validates                                          |
| ---- | -------------------------------- | -------------------------------------------------- |
| IT01 | api-gateway → gps-tracking       | GPS location POST through gateway with auth        |
| IT02 | api-gateway → emergency-alerts   | Emergency event POST through gateway with auth     |
| IT03 | api-gateway → student-presence   | Presence event POST through gateway with auth      |
| IT04 | api-gateway → student-management | Student CRUD through gateway with tenant scoping   |
| IT05 | api-gateway                      | Cross-tenant access rejection (school_id mismatch) |
| IT06 | api-gateway                      | Role-based endpoint access matrix                  |
| IT07 | gps-tracking → postgres          | Location persistence and spatial queries           |
| IT08 | emergency-alerts → redis         | Alert queue enqueue and process                    |

### Smoke Tests (SM01–SM08)

These are executed by `scripts/verify-demo.sh`:

| ID   | Validates                                             |
| ---- | ----------------------------------------------------- |
| SM01 | Database tables exist and contain seeded data         |
| SM02 | User authentication for all demo roles                |
| SM03 | GPS location POST via gateway succeeds                |
| SM04 | Student presence event POST via gateway succeeds      |
| SM05 | Emergency alert POST via gateway succeeds             |
| SM06 | Admin can list students (scoped by school_id)         |
| SM07 | Parent can access child routes (authorization check)  |
| SM08 | Driver can post GPS but cannot access admin endpoints |

### Authorization Tests (AZ01–AZ05)

| ID   | Validates                                             |
| ---- | ----------------------------------------------------- |
| AZ01 | PARENT can read live-location for assigned route only |
| AZ02 | PARENT cannot read live-location for unassigned route |
| AZ03 | DRIVER can POST GPS but cannot GET student lists      |
| AZ04 | SCHOOL_ADMIN can read students only for own school_id |
| AZ05 | Unauthenticated requests return 401                   |

### E2E Browser UI Tests — Authentication (AT01–AT12)

File: `apps/admin-dashboard/e2e/auth.spec.ts`

| ID   | Validates                                                                       |
| ---- | ------------------------------------------------------------------------------- |
| AT01 | Login form renders email, password and sign-in button                           |
| AT02 | Empty form submit shows "Please enter both email and password"                  |
| AT03 | Wrong credentials show "Invalid credentials" error                              |
| AT04 | DRIVER stale localStorage session is detected and cleared, redirected to /login |
| AT05 | PARENT stale localStorage session is detected and cleared, redirected to /login |
| AT06 | DRIVER is redirected from /dashboard to /login                                  |
| AT07 | PARENT is redirected from /dashboard to /login                                  |
| AT08 | DRIVER cannot access /compliance via direct URL                                 |
| AT09 | SUPER_ADMIN session persists across page reload                                 |
| AT10 | Logout clears localStorage and redirects to /login                              |
| AT11 | Unauthenticated direct navigation to /dashboard redirects to /login             |
| AT12 | Already-authenticated admin visiting /login is redirected to /dashboard         |

### E2E Browser UI Tests — Sidebar Navigation (SN01–SN18)

File: `apps/admin-dashboard/e2e/sidebar-navigation.spec.ts`

| ID   | Role         | Validates                                            |
| ---- | ------------ | ---------------------------------------------------- |
| SN01 | SUPER_ADMIN  | Sees all 10 common admin navigation items            |
| SN02 | SUPER_ADMIN  | Sees Fleet, Boards, Schools and Users nav items      |
| SN03 | SUPER_ADMIN  | Fleet nav link URL is /vehicles                      |
| SN04 | SUPER_ADMIN  | Users nav link URL is /users                         |
| SN05 | OSTA_ADMIN   | Sees all common items plus Fleet, Boards and Schools |
| SN06 | OSTA_ADMIN   | Does NOT see Users nav item                          |
| SN07 | BOARD_ADMIN  | Sees all 10 common admin navigation items            |
| SN08 | BOARD_ADMIN  | Sees Schools nav item                                |
| SN09 | BOARD_ADMIN  | Does NOT see Fleet, Boards or Users                  |
| SN10 | SCHOOL_ADMIN | Sees exactly the 10 common admin navigation items    |
| SN11 | SCHOOL_ADMIN | Does NOT see Fleet, Boards, Schools or Users         |
| SN12 | SUPER_ADMIN  | Assignments nav link URL is /fleet-assignments       |
| SN13 | SUPER_ADMIN  | Compliance nav link URL is /compliance               |
| SN14 | SUPER_ADMIN  | Clicking Dashboard navigates to /dashboard           |
| SN15 | SUPER_ADMIN  | Clicking Settings navigates to /settings             |
| SN16 | SCHOOL_ADMIN | SCHOOL_ADMIN role label is displayed in the header   |
| SN17 | BOARD_ADMIN  | BOARD_ADMIN role label is displayed in the header    |
| SN18 | OSTA_ADMIN   | OSTA_ADMIN role label is displayed in the header     |

### E2E Browser UI Tests — Route Guards (RG01–RG16)

File: `apps/admin-dashboard/e2e/route-guards.spec.ts`

| ID   | Role         | Validates                                              |
| ---- | ------------ | ------------------------------------------------------ |
| RG01 | SUPER_ADMIN  | Can navigate to /vehicles                              |
| RG02 | SUPER_ADMIN  | Can navigate to /boards                                |
| RG03 | SUPER_ADMIN  | Can navigate to /schools                               |
| RG04 | SUPER_ADMIN  | Can navigate to /users                                 |
| RG05 | OSTA_ADMIN   | Can navigate to /vehicles                              |
| RG06 | OSTA_ADMIN   | Direct navigation to /users redirects to /dashboard    |
| RG07 | BOARD_ADMIN  | Direct navigation to /vehicles redirects to /dashboard |
| RG08 | BOARD_ADMIN  | Direct navigation to /boards redirects to /dashboard   |
| RG09 | BOARD_ADMIN  | Direct navigation to /users redirects to /dashboard    |
| RG10 | BOARD_ADMIN  | Can navigate to /schools                               |
| RG11 | SCHOOL_ADMIN | Direct navigation to /vehicles redirects to /dashboard |
| RG12 | SCHOOL_ADMIN | Direct navigation to /boards redirects to /dashboard   |
| RG13 | SCHOOL_ADMIN | Direct navigation to /schools redirects to /dashboard  |
| RG14 | SCHOOL_ADMIN | Direct navigation to /users redirects to /dashboard    |
| RG15 | SCHOOL_ADMIN | Can navigate to /fleet-assignments                     |
| RG16 | SCHOOL_ADMIN | Can navigate to /compliance                            |

### E2E Browser UI Tests — Compliance Page (CP01–CP16)

File: `apps/admin-dashboard/e2e/compliance.spec.ts`

| ID   | Role         | Validates                                                  |
| ---- | ------------ | ---------------------------------------------------------- |
| CP01 | SUPER_ADMIN  | /compliance, /inspections, /audit API endpoints return 200 |
| CP02 | SUPER_ADMIN  | "Compliance & Safety" heading is visible                   |
| CP03 | SUPER_ADMIN  | Drivers, Inspections and Audit tabs are visible            |
| CP04 | SUPER_ADMIN  | Switching compliance tabs produces no 500 errors           |
| CP05 | OSTA_ADMIN   | /compliance, /inspections, /audit API endpoints return 200 |
| CP06 | OSTA_ADMIN   | "Compliance & Safety" heading is visible                   |
| CP07 | OSTA_ADMIN   | Drivers, Inspections and Audit tabs are visible            |
| CP08 | OSTA_ADMIN   | Switching compliance tabs produces no 500 errors           |
| CP09 | BOARD_ADMIN  | /compliance, /inspections, /audit API endpoints return 200 |
| CP10 | BOARD_ADMIN  | "Compliance & Safety" heading is visible                   |
| CP11 | BOARD_ADMIN  | Drivers, Inspections and Audit tabs are visible            |
| CP12 | BOARD_ADMIN  | Switching compliance tabs produces no 500 errors           |
| CP13 | SCHOOL_ADMIN | /compliance, /inspections, /audit API endpoints return 200 |
| CP14 | SCHOOL_ADMIN | "Compliance & Safety" heading is visible                   |
| CP15 | SCHOOL_ADMIN | Drivers, Inspections and Audit tabs are visible            |
| CP16 | SCHOOL_ADMIN | Switching compliance tabs produces no 500 errors           |

### E2E Browser UI Tests — Students Page (STU01–STU12)

File: `apps/admin-dashboard/e2e/students.spec.ts`

| ID    | Validates                                                                             |
| ----- | ------------------------------------------------------------------------------------- |
| STU01 | SUPER_ADMIN loads /students without console errors                                    |
| STU02 | SUPER_ADMIN — Live Presence tab is active by default                                  |
| STU03 | SUPER_ADMIN — can switch to Administration tab without 500 errors                     |
| STU04 | OSTA_ADMIN loads /students without console errors                                     |
| STU05 | OSTA_ADMIN — Live Presence tab is active by default                                   |
| STU06 | OSTA_ADMIN — can switch to Administration tab without 500 errors                      |
| STU07 | BOARD_ADMIN loads /students without console errors                                    |
| STU08 | BOARD_ADMIN — Live Presence tab is active by default                                  |
| STU09 | BOARD_ADMIN — can switch to Administration tab without 500 errors                     |
| STU10 | SCHOOL_ADMIN — switching Live Presence → Administration → Live Presence is error-free |
| STU11 | Administration tab triggers a GET /students API call                                  |
| STU12 | No console errors on initial /students load                                           |

### E2E Browser UI Tests — Fleet & Assignments (FA01–FA10)

File: `apps/admin-dashboard/e2e/fleet-assignments.spec.ts`

| ID   | Validates                                                                   |
| ---- | --------------------------------------------------------------------------- |
| FA01 | SUPER_ADMIN loads /vehicles without 500 errors                              |
| FA02 | OSTA_ADMIN loads /vehicles without 500 errors                               |
| FA03 | BOARD_ADMIN is redirected from /vehicles to /dashboard                      |
| FA04 | SCHOOL_ADMIN is redirected from /vehicles to /dashboard                     |
| FA05 | OSTA_ADMIN sees Fleet item in the sidebar                                   |
| FA06 | SCHOOL_ADMIN does NOT see Fleet item in the sidebar                         |
| FA07 | SCHOOL_ADMIN can access /fleet-assignments page without 500 errors          |
| FA08 | BOARD_ADMIN can access /fleet-assignments page without 500 errors           |
| FA09 | OSTA_ADMIN sees Fleet Assignments page heading                              |
| FA10 | SCHOOL_ADMIN sees Fleet Assignments heading but no "Create Proposal" button |

---

## 5. Test Data Policy

- **NEVER** use real student, parent, or driver personal data
- All test fixtures use **synthetic demo data** with Ottawa/Gatineau area coordinates
- Demo user emails use the `@sbtm.demo` domain
- Student IDs use the `STUDENT-XXX` format; route IDs use `ROUTE-X`
- Seeded data is deterministic — `scripts/init-db.sql` is the single source of truth
- Test isolation: each test run should use `reset-demo-db.sh` to start clean

---

## 6. Mocking Standards

- External dependencies (PostgreSQL, Redis) are mocked at the repository/provider boundary in unit tests
- Use NestJS `Test.createTestingModule()` with provider overrides for service-level unit tests
- Integration tests use real Docker containers via `docker-compose.ci.yml`
- Frontend tests use MSW (Mock Service Worker) for API mocking
- No mocking of internal service logic — mock only at system boundaries

---

## 7. CI Pipeline Stages

> **Current state (2026-03-30)**: No GitHub Actions workflow or other CI pipeline is implemented yet. The stages below define the **target CI pipeline design**. Root `package.json` scripts (`build`, `test`, `lint`) are currently placeholders. CI automation is a known gap.

```
SG-1: Lint       →  SG-2: Build     →  SG-3: Unit Tests  →  SG-4: Integration  →  SG-5: Smoke
 (eslint,            (tsc, Vite        (jest + 80%          (docker-compose       (verify-demo.sh
  prettier)           build)            coverage)            + e2e-spec.ts)         POST checks)
```

| Stage                 | Blocks PR | Time Budget |
| --------------------- | --------- | ----------- |
| Lint & Format         | Yes       | < 2 min     |
| Build                 | Yes       | < 5 min     |
| Unit Tests + Coverage | Yes       | < 5 min     |
| Integration Tests     | Yes       | < 10 min    |
| Smoke Tests           | Warn only | < 5 min     |

---

## 8. Current Smoke Tests

### API Gateway Health

```bash
curl http://localhost:3001/api/v1/health
```

### Auth Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"osta.admin@sbtm.demo","password":"Admin123!"}'
```

Store the returned `accessToken` and use it for protected calls:

```bash
export TOKEN=<access-token>
```

### GPS Tracking (via Gateway)

```bash
curl -X POST http://localhost:3001/api/v1/routes/locations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"BUS-001","routeId":"ROUTE-A","timestamp":"2026-02-10T08:00:00Z","lat":45.4215,"lng":-75.6972}'
```

### Presence (Manual via Gateway)

```bash
curl -X POST http://localhost:3001/api/v1/student-presence-events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"STUDENT-001","vehicleId":"BUS-001","routeId":"ROUTE-A","eventType":"BOARD","timestamp":"2026-02-10T08:00:00Z","source":"MANUAL"}'
```

### Emergency Alerts (via Gateway)

```bash
curl -X POST http://localhost:3001/api/v1/emergency-events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"BUS-001","routeId":"ROUTE-A","driverId":"driver-001","timestamp":"2026-02-10T08:00:00Z","lat":45.4215,"lng":-75.6972,"eventType":"PANIC_BUTTON"}'
```

---

## 9. Running Tests

### Run unit tests for a single service

```bash
cd services/api-gateway
pnpm test
```

### Run unit tests with coverage

```bash
cd services/api-gateway
pnpm run test:cov
```

### Run integration tests

```bash
# Start test infrastructure
# Note: docker-compose.ci.yml currently only builds admin-dashboard.
# For full integration testing, use docker-compose.yml with docker-compose.infra.yml override.
docker compose -f docker-compose.yml -f docker-compose.infra.yml up -d

# Run integration tests for a service
cd services/api-gateway
pnpm run test:e2e

# Tear down
docker compose -f docker-compose.yml -f docker-compose.infra.yml down -v
```

### Run all smoke tests

```bash
./scripts/verify-demo.sh
```

### Run E2E browser UI tests (Playwright)

Prerequisites: admin-dashboard Vite dev server and all backend services must be running (Hybrid or Full Docker mode).

```bash
# Run all E2E tests (87 tests across 6 spec files)
pnpm --filter admin-dashboard test:e2e

# Run a single spec file
npx playwright test e2e/auth.spec.ts

# Run tests matching a pattern
npx playwright test --grep "AT09|AT10"

# Run in headed mode (see the browser)
pnpm --filter admin-dashboard test:e2e:headed

# Open the interactive Playwright UI
pnpm --filter admin-dashboard test:e2e:ui

# Show the HTML test report
npx playwright show-report apps/admin-dashboard/playwright-report
```

> Tip: Run `./scripts/dev-hybrid.sh` before running E2E tests to start the full stack locally.

### Full demo environment test

```bash
# Reset, seed, verify, and simulate
./scripts/reset-demo-db.sh
./scripts/simulate-demo.sh --interval 5 --laps 2
```

---

## 10. Current Coverage Gaps

- No documented queue-consumer integration checks yet
- No documented contract tests for event payloads between services
- No documented authorization regression suite for cross-tenant access
- No documented mobile BLE verification flow
- No Playwright E2E tests for the parent portal (`apps/parent-app`)
- No performance/load benchmarks for GPS ingest throughput

## 11. Integration Focus By Upgrade Phase

### INC-1 (Rate Limiting & Service Auth Activation)

- Verify rate limiting returns 429 for excessive requests
- Verify service-to-service calls include valid auth headers

### INC-2 (Correlation IDs & Observability)

- Verify correlation IDs propagate through multi-service calls
- Verify structured log output includes correlation context

### INC-3 (Centralized Audit Pipeline)

- Verify audit events are published and consumed end-to-end
- Verify audit query returns entries scoped by school_id

### INC-4 (Data Retention & DSAR)

- Verify data retention purge jobs remove expired records
- Verify DSAR export produces correct per-student data extract
