# SBTM Local Development & Testing Guide

Efficient strategies for developing and testing the SBTM system locally. Three modes are available depending on what you're working on.

> **Debugging an issue that only reproduces on Azure (`demo` or `production`)?**
> See [`cloud_debugging_guide.md`](cloud_debugging_guide.md) — it covers the
> seven-layer debugging stack (DNS → TLS → ingress → pod → App Insights → DB),
> standard playbooks for cloud-only failures, and how to use `kubectl
port-forward` / `mirrord` to attach a local debugger to a real cloud workload
> without rebuilding the cluster locally.

---

## 🎯 Strategy Quick Reference

| Strategy        | What Starts                   | Best For                           | Command                   |
| :-------------- | :---------------------------- | :--------------------------------- | :------------------------ |
| **Mock Mode**   | Vite only                     | UI layout, styling, frontend logic | `./scripts/dev-mock.sh`   |
| **Hybrid Mode** | Docker infra + local services | Full-stack feature work            | `./scripts/dev-hybrid.sh` |
| **Full Docker** | Everything in containers      | CI/CD, final integration           | `docker compose up -d`    |

---

## 🚀 Strategy 1: Mock Mode (Zero Backend)

The fastest path for UI-only changes. No Docker, no database, no backend services. All API calls return mock data from `src/services/mock/`.

```bash
./scripts/dev-mock.sh
```

- **URL**: `http://localhost:5173`
- **Login**: Any email/password works
- **Hot-reload**: Sub-100ms for CSS/TSX changes
- **Toggle at runtime**: Append `?mock=true` to any URL or set `VITE_USE_MOCK=true` in `.env`

### Mock Data Architecture

Mock code is completely separated from production code:

```
src/services/
├── api/           # Production API clients (axios)
│   ├── index.ts   # Barrel — conditionally exports mock or real
│   ├── auth.api.ts
│   ├── alerts.api.ts
│   └── ...
└── mock/          # Mock layer (only loaded when VITE_USE_MOCK=true)
    ├── index.ts   # Mock barrel
    ├── data/      # Pure data constants (one file per domain)
    │   ├── alerts.data.ts
    │   ├── routes.data.ts
    │   └── ...
    └── handlers/  # Mock API implementations
        ├── alerts.mock.ts
        ├── routes.mock.ts
        └── ...
```

> **To modify mock data**: Edit files in `src/services/mock/data/`. To change mock behavior, edit files in `src/services/mock/handlers/`.

---

## 🔧 Strategy 2: Hybrid Mode (Docker Infra + Local Services)

Run infrastructure (Postgres, Redis, OSRM) in Docker while running application services directly on your machine for fast iteration.

### Full Hybrid (all services)

```bash
./scripts/dev-hybrid.sh
```

### Selective Services (only what you need)

```bash
./scripts/dev-hybrid.sh api-gateway gps-tracking
```

### Infrastructure Only (start services manually)

```bash
./scripts/dev-hybrid.sh --infra-only
cd services/api-gateway && pnpm run start:dev
```

### Environment Setup

Copy the template on first use:

```bash
cp .env.hybrid.template .env
```

Key settings for Hybrid mode:

- `DB_HOST=localhost`, `DB_PORT=5433` (Docker maps 5432→5433)
- `REDIS_HOST=localhost`, `REDIS_PORT=6379`
- All service URLs point to `http://localhost:300x`

### Stopping

```bash
./scripts/dev-stop.sh               # Stop everything
./scripts/dev-stop.sh --keep-infra  # Keep Docker running
```

### Local Frontend Development

Use this only when you are actively developing UI locally:

```bash
# Admin Dashboard
cd apps/admin-dashboard
pnpm install
pnpm run dev

# Parent Portal (new terminal)
cd apps/parent-dashboard/web
pnpm install
pnpm run dev
```

Set `VITE_API_URL` to `http://localhost:3001` for both.

### Schema, Sample Data, and Dev Credentials

Setting up the v2 database is a **two-step process**. Step 1 applies the schema and seeds system/STA users. Step 2 imports the sample STA bundles (OSTA + RCJTC), which creates all transport data and resolves the board/school/driver/parent account anchor IDs.

**Step 1 — Schema + system users** (run once after `dev-hybrid.sh`):

```bash
./scripts/schema-seed/init-db.sh
```

**Step 2 — Import sample bundles + seed all dev credentials**:

```bash
./scripts/schema-seed/import-and-seed.sh
```

> **OSRM road-snapped shapes** — By default the importer uses stop coordinates for route shapes (straight-line). To generate accurate road-snapped polylines using the OSRM container started by `dev-hybrid.sh`:
>
> ```bash
> OSRM_BASE_URL=http://localhost:5000 ./scripts/schema-seed/import-and-seed.sh
> ```

After step 2 completes, all transport tables, ridership data, and dev credentials are ready. The script prints every account email and password on exit.

Both scripts are idempotent — safe to re-run (all inserts use `ON CONFLICT DO UPDATE`).

---

## 🐳 Strategy 3: Full Docker Mode

Runs everything in containers. Use for final integration testing or CI.

```bash
docker compose up -d --build
```

---

## User Accounts (Dev Seed Data)

> Populated by `scripts/schema-seed/import-and-seed.sh` (Step 2 above).
> Run that script first — it prints all accounts on exit.

**System / STA** — password `Admin123!`

| Role        | Email                       | Scope       |
| :---------- | :-------------------------- | :---------- |
| SUPER_ADMIN | `super.admin@sbtm.demo`     | Full system |
| STA_ADMIN   | `sta.admin@osta.sbtm.demo`  | OSTA        |
| STA_ADMIN   | `sta.admin@rcjtc.sbtm.demo` | RCJTC       |

**Board Admins** — password `Admin123!`

| Email                    | Board  |
| :----------------------- | :----- |
| `ocdsb.admin@sbtm.demo`  | OCDSB  |
| `ocsb.admin@sbtm.demo`   | OCSB   |
| `rcdsb.admin@sbtm.demo`  | RCDSB  |
| `rccdsb.admin@sbtm.demo` | RCCDSB |

**School Admins** — password `Admin123!`

| Email                       | School                |
| :-------------------------- | :-------------------- |
| `admin.maplewood@sbtm.demo` | Maplewood PS (OCDSB)  |
| `admin.stbern@sbtm.demo`    | St. Bernadette (OCSB) |
| `admin.pinecrest@sbtm.demo` | Pinecrest ES (RCDSB)  |
| `admin.cathedral@sbtm.demo` | Cathedral HS (RCCDSB) |

**Drivers** — password `Admin123!`

| Email                        | Route          |
| :--------------------------- | :------------- |
| `driver.maplewood@sbtm.demo` | Maplewood PS   |
| `driver.stbern@sbtm.demo`    | St. Bernadette |
| `driver.pinecrest@sbtm.demo` | Pinecrest ES   |
| `driver.cathedral@sbtm.demo` | Cathedral HS   |

**Parents / Guardians** — password `Parent123!`

| Email                          | Guardian ID    |
| :----------------------------- | :------------- |
| `sam.demo@example.test`        | OSTA-GRD-0001  |
| `chris.specimen@example.test`  | OSTA-GRD-0002  |
| `pat.sample@example.test`      | OSTA-GRD-0003  |
| `kerry.example@example.test`   | OSTA-GRD-0004  |
| `jordan.pembroke@example.test` | RCJTC-GRD-0001 |
| `robin.renfrew@example.test`   | RCJTC-GRD-0002 |
| `alex.cathedral@example.test`  | RCJTC-GRD-0003 |
| `sage.pinecrest@example.test`  | RCJTC-GRD-0004 |

---

## 🧪 Testing

### Frontend Tests (Vitest)

```bash
cd apps/admin-dashboard && pnpm run test
```

### Backend E2E Tests (Jest + Supertest)

```bash
cd services/<service-name> && pnpm run test:e2e
```

### E2E Browser UI Tests (Playwright)

Playwright tests run against the live admin dashboard and backend APIs. All 87 tests cover authentication, role-based sidebar navigation, route guards, compliance, students, and fleet pages.

**Prerequisites**: Hybrid or Full Docker mode must be running (backend + DB + admin-dashboard Vite dev server).

```bash
# Start the full stack first (choose one)
./scripts/dev-hybrid.sh           # Recommended for local E2E testing
# OR
docker compose up -d              # Full Docker mode

# Run all 87 E2E tests
pnpm --filter admin-dashboard test:e2e

# Run a single spec file
npx playwright test apps/admin-dashboard/e2e/auth.spec.ts

# Run with visible browser (headed mode)
pnpm --filter admin-dashboard test:e2e:headed

# Open the interactive Playwright UI
pnpm --filter admin-dashboard test:e2e:ui

# View the HTML test report after a run
npx playwright show-report apps/admin-dashboard/playwright-report
```

**Test files and coverage**:

| Spec file                    | Test IDs    | What it covers                           |
| :--------------------------- | :---------- | :--------------------------------------- |
| `auth.spec.ts`               | AT01–AT12   | Login form, role blocking, session flows |
| `sidebar-navigation.spec.ts` | SN01–SN18   | Role-based nav item visibility           |
| `route-guards.spec.ts`       | RG01–RG16   | Direct URL access enforcement per role   |
| `compliance.spec.ts`         | CP01–CP16   | Compliance page API + tab switching      |
| `students.spec.ts`           | STU01–STU12 | Students page tabs + API calls           |
| `fleet-assignments.spec.ts`  | FA01–FA10   | Fleet/assignments access per role        |

**loginAs fixture**: Tests use a shared `loginAs(page, role)` helper that:

1. Navigates to `/login`
2. Makes a real `POST /api/v1/auth/login` to obtain the `access_token` cookie (prevents 401 redirect from the api-client interceptor)
3. Sets `auth_user` in localStorage (used by `AuthContext` to set `isAuthenticated`)
4. Navigates to `/dashboard` and waits for React to fully bootstrap

### TypeScript Check

```bash
cd apps/admin-dashboard && npx tsc --noEmit
```

---

## 🔎 End-to-End Validation via `dev-hybrid` + Seeded Demo DB

Use this checklist to confirm a freshly started Hybrid environment is fully functional after a code change, infra tweak, or hardcoded-value cleanup. Every command is read-only against the seeded demo DB and uses synthetic seed identities only — never paste real student/guardian data.

### 0. Start clean

```bash
# Hard cleanup of any prior dev session (kills orphan watchers + frees ports)
./scripts/dev-stop.sh
for p in 3001 3002 3003 3004 3005 3006 3007 3008 5173 5174 5175; do
  pids=$(lsof -ti :$p 2>/dev/null) && [ -n "$pids" ] && kill -9 $pids
done
rm -f .dev-pids/*.pid

# Launch the full stack (8 services + admin :5173 + parent :5174)
./scripts/dev-hybrid.sh
```

### 1. Service health (read log files, not the watcher TTY)

```bash
for s in api-gateway gps-tracking emergency-alerts student-presence \
         student-management compliance-management notification-service video-service; do
  log=.dev-logs/${s}.log
  ok=$(grep -aE "is running|Listening on|listening on|GPS Tracking Service running" "$log" | tail -1)
  err=$(grep -aE "ERROR|Error:|EADDRINUSE" "$log" | tail -1)
  if [ -n "$ok" ]; then echo "OK   $s"; else echo "FAIL $s :: ${err:-no startup}"; fi
done
curl -s -o /dev/null -w "admin  :: %{http_code}\n" http://localhost:5173/
curl -s -o /dev/null -w "parent :: %{http_code}\n" http://localhost:5174/
```

Expect 8 `OK` lines plus `200` for both dashboards.

### 2. Seeded DB sanity

```bash
PGPASSWORD=mysecretpassword psql -h localhost -p 5433 -U postgres -d sbms \
  -c "SELECT email, role FROM users LIMIT 5;"
```

If empty, run `./scripts/reset-demo-db.sh` (or `psql -f scripts/seed-demo.sql`) before continuing.

### 3. CORS preflight from each dashboard origin

```bash
for origin in http://localhost:5173 http://localhost:5174 http://localhost:5175; do
  echo "=== $origin ==="
  curl -s -o /dev/null -D - -X OPTIONS \
    -H "Origin: $origin" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type" \
    http://localhost:3001/api/v1/auth/login | grep -iE "HTTP|access-control-allow-origin"
done
```

Expect `HTTP/1.1 204` and `Access-Control-Allow-Origin: <origin>` for each.

### 4. Auth + protected endpoint round-trip

```bash
LOGIN=$(curl -s -H "Content-Type: application/json" \
  -d '{"email":"super.admin@sbtm.demo","password":"Admin123!"}' \
  http://localhost:3001/api/v1/auth/login)
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOKEN" ] && echo "login OK" || { echo "login FAILED: $LOGIN"; exit 1; }

curl -s -o /dev/null -w "presence/events :: HTTP %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/presence/events?limit=100"
```

Expect `login OK` and `HTTP 200`. A 500 here typically means the api-gateway
cannot mint an internal service JWT — check that `INTERNAL_SERVICE_SECRET` is
exported to every downstream service in [`scripts/dev-hybrid.sh`](../../scripts/dev-hybrid.sh).

### 5. WebSocket / SSE handshakes

```bash
# Direct against the standalone gateways (admin dashboard targets these via
# VITE_ALERTS_WS_URL / VITE_PRESENCE_WS_URL — the api-gateway does NOT proxy WS)
curl -s -o /dev/null -w "alerts   :3003 :: HTTP %{http_code}\n" \
  -H "Origin: http://localhost:5173" \
  "http://localhost:3003/ws/alerts/?EIO=4&transport=polling"
curl -s -o /dev/null -w "presence :3004 :: HTTP %{http_code}\n" \
  -H "Origin: http://localhost:5173" \
  "http://localhost:3004/ws/presence/?EIO=4&transport=polling"
```

Both must return `HTTP 200`. A non-200 here means the gateway is rejecting the
origin — verify `CORS_ORIGINS` includes the dashboard origin.

### 6. Package-level test pass on touched code

For each package whose source you changed, run its own validation cycle (per
the agent's Phase 5):

```bash
cd <package> && pnpm run lint && pnpm run build && pnpm run test
```

Do not rely on root workspace scripts — they are placeholders.

### 7. Tear down

```bash
./scripts/dev-stop.sh
```

---

## 🧪 Phase C: Testing New Workflows

These workflows require Hybrid or Full Docker mode with seeded data.

### Fleet Assignment Workflow

1. **Login as OSTA Admin** (`sta.admin@sbtm.demo`)
2. **Propose an assignment**:
   ```
   POST /api/v1/fleet-assignments
   { "routeId": "...", "busId": "...", "driverId": "...", "effectiveDate": "..." }
   ```
3. **Login as School Admin** (`school.admin@sbtm.demo`)
4. **Accept or reject**:
   ```
   PATCH /api/v1/fleet-assignments/:id/accept
   PATCH /api/v1/fleet-assignments/:id/reject
   ```

### Absence Confirmation Workflow

1. **Login as Parent** (`parent1@sbtm.demo`)
2. **Report an absence**:
   ```
   POST /api/v1/absences
   { "studentId": "...", "date": "...", "reason": "..." }
   ```
3. **Login as School Admin** (`school.admin@sbtm.demo`)
4. **Confirm or reject**:
   ```
   PATCH /api/v1/absences/:id/confirm
   PATCH /api/v1/absences/:id/reject
   ```

### Role-Based Sidebar

Login as each role (SUPER_ADMIN, BOARD_ADMIN, STA_ADMIN, SCHOOL_ADMIN, DRIVER, PARENT) and verify the sidebar shows only the menu items permitted for that role.

### Alert Ownership (School-Scoped)

1. Login as **School Admin** (`school.admin@sbtm.demo`)
2. Verify alerts are only visible/confirmable for routes belonging to Greenfield Elementary
3. Alerts from other schools should not appear

---

## 🛠️ Troubleshooting

| Problem                | Solution                                                                                          |
| :--------------------- | :------------------------------------------------------------------------------------------------ |
| 401 Unauthorized       | Clear `localStorage` (`localStorage.clear()`) and re-login                                        |
| DB connection refused  | Check `DB_HOST=localhost` and `DB_PORT=5433` in your env                                          |
| Port conflict          | Run `./scripts/dev-stop.sh` to kill stale processes. Check Docker isn't running the same service. |
| OSRM not starting      | Run `./scripts/setup-osrm.sh` first to download map data                                          |
| Service crash on start | Check logs in `.dev-logs/<service>.log`                                                           |

---

## 🤖 AI Agent Recommendation

- For **UI-only changes**: Always use Mock Mode first (`./scripts/dev-mock.sh`).
- For **backend logic**: Use Hybrid Mode with only the relevant service.
- Never run Full Docker for iterative development—it's too slow.
