# SBTM Local Development & Testing Guide

Efficient strategies for developing and testing the SBTM system locally. Three modes are available depending on what you're working on.

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
cd services/api-gateway && npm run start:dev
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

### Running Simulation Data

To populate real-time GPS data on the map:

```bash
./scripts/simulate-demo.sh
```

---

## 🐳 Strategy 3: Full Docker Mode

Runs everything in containers. Use for final integration testing or CI.

```bash
docker compose up -d --build
```

---

## 🔑 User Accounts (Seed Data)

All accounts use password **`Admin123!`**.

| Role         | Email                    | Notes                                            |
| :----------- | :----------------------- | :----------------------------------------------- |
| SUPER_ADMIN  | `super.admin@sbtm.demo`  | Full system access                               |
| BOARD_ADMIN  | `board.admin@sbtm.demo`  | Board-level administration (OSDSB)               |
| OSTA_ADMIN   | `osta.admin@sbtm.demo`   | Fleet & route management                         |
| SCHOOL_ADMIN | `school.admin@sbtm.demo` | School-scoped operations (Greenfield Elementary) |
| DRIVER       | `driver1@sbtm.demo`      | Driver for BUS-01                                |
| PARENT       | `parent1@sbtm.demo`      | Parent portal (also parent2, parent4, parent5)   |

---

## 🧪 Testing

### Frontend Tests (Vitest)

```bash
cd apps/admin-dashboard && npm run test
```

### Backend E2E Tests (Jest + Supertest)

```bash
cd services/<service-name> && npm run test:e2e
```

### TypeScript Check

```bash
cd apps/admin-dashboard && npx tsc --noEmit
```

---

## 🧪 Phase C: Testing New Workflows

These workflows require Hybrid or Full Docker mode with seeded data.

### Fleet Assignment Workflow

1. **Login as OSTA Admin** (`osta.admin@sbtm.demo`)
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

Login as each role (SUPER_ADMIN, BOARD_ADMIN, OSTA_ADMIN, SCHOOL_ADMIN, DRIVER, PARENT) and verify the sidebar shows only the menu items permitted for that role.

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
