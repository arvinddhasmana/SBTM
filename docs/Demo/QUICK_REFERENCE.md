# Demo Quick Reference

- Document owner: QA and Engineering
- Last reviewed: 2026-04-12
- Primary use: Fast operational checklist for demo setup and troubleshooting

This is the fast operational companion to `DEMO_SETUP_GUIDE.md`. For feature gaps or upgrade status, use `docs/prd/GapAnalysis.md`.

## Related Documents

- [DEMO_SETUP_GUIDE.md](DEMO_SETUP_GUIDE.md)
- [LiveDemoScript.md](LiveDemoScript.md)
- [GapAnalysis.md](../prd/v4/GapAnalysis.md)
- [TestingGuide.md](../Test/TestingGuide.md)

## Fast Commands

### Complete Reset (Most Common)

```bash
./scripts/reset-demo-db.sh
```

### Verify Setup

```bash
./scripts/verify-demo.sh
```

### Regenerate Route Data (Optional)

```bash
npx tsx scripts/generate-demo-routes.ts --from-cache   # SQL from cached JSON (no OSRM)
npx tsx scripts/generate-demo-routes.ts                 # Full generation (needs OSRM)
```

## Demo Credentials

All passwords: **Admin123!**

### System Admins

| Role              | Email                   | Notes                 |
| ----------------- | ----------------------- | --------------------- |
| Super Admin       | `super.admin@sbtm.demo` | System-wide access    |
| OSTA Admin        | `osta.admin@sbtm.demo`  | Cross-board oversight |
| OCDSB Board Admin | `ocdsb.admin@sbtm.demo` | OCDSB board scope     |
| OCSB Board Admin  | `ocsb.admin@sbtm.demo`  | OCSB board scope      |

### Per-School Users

| School (Abbrev)         | Board | School Admin              | Driver                     | Bus            |
| ----------------------- | ----- | ------------------------- | -------------------------- | -------------- |
| St. Bernadette (STBERN) | OCSB  | `admin.stbern@sbtm.demo`  | `driver.stbern@sbtm.demo`  | BUS-STBERN-01  |
| All Saints (ALLSNT)     | OCSB  | `admin.allsnt@sbtm.demo`  | `driver.allsnt@sbtm.demo`  | BUS-ALLSNT-01  |
| Sacred Heart (SACRHRT)  | OCSB  | `admin.sacrhrt@sbtm.demo` | `driver.sacrhrt@sbtm.demo` | BUS-SACRHRT-01 |
| John Young (JYOUNG)     | OCDSB | `admin.jyoung@sbtm.demo`  | `driver.jyoung@sbtm.demo`  | BUS-JYOUNG-01  |
| Maplewood (MPLWD)       | OCDSB | `admin.mplwd@sbtm.demo`   | `driver.mplwd@sbtm.demo`   | BUS-MPLWD-01   |
| A.Y. Jackson (AYJACK)   | OCDSB | `admin.ayjack@sbtm.demo`  | `driver.ayjack@sbtm.demo`  | BUS-AYJACK-01  |

**Parents:** `parent1.{abbrev}@sbtm.demo` -- `parent10.{abbrev}@sbtm.demo` (60 total)

### Quick Start (Single School Demo)

- Admin: `admin.stbern@sbtm.demo`
- Driver: `driver.stbern@sbtm.demo`
- Parent: `parent1.stbern@sbtm.demo`

## Route IDs

Pattern: `ROUTE-{ABBREV}-R{01-05}-{AM|PM}`

Example routes for St. Bernadette:

- `ROUTE-STBERN-R01-AM` through `ROUTE-STBERN-R05-AM` (morning)
- `ROUTE-STBERN-R01-PM` through `ROUTE-STBERN-R05-PM` (afternoon)

**Total: 60 routes** (10 per school x 6 schools)

## Portal URLs

### Cloud demo (Azure Static Web Apps)

After `bash scripts/azure/bootstrap.sh demo canadacentral` and DNS delegation:

- Admin Dashboard: https://admin.sbtm.ca
- Parent Portal: https://parent.sbtm.ca
- API Gateway: https://api.sbtm.ca

Verify with: `bash scripts/azure/verify-portals.sh demo`

See [docs/Deployment/CustomDomainSetup.md](../Deployment/CustomDomainSetup.md) for the one-time NS delegation step.

### Local Docker

- Admin Dashboard: http://localhost:5173
- Parent Portal: http://localhost:5174
- API Gateway: http://localhost:3001

## Seeded Demo Data

### Schools (6)

| School                             | Board | Location          |
| ---------------------------------- | ----- | ----------------- |
| St. Bernadette Catholic Elementary | OCSB  | 45.2705, -75.8849 |
| All Saints High School             | OCSB  | 45.3219, -75.9251 |
| Sacred Heart Catholic High School  | OCSB  | 45.2642, -75.9103 |
| John Young Elementary School       | OCDSB | 45.2900, -75.8841 |
| Maplewood Secondary School         | OCDSB | 45.2674, -75.8914 |
| A.Y. Jackson S.S.                  | OCDSB | 45.2953, -75.8795 |

### Per School

- 1 school admin, 1 driver, 1 bus
- 5 AM routes + 5 PM routes (10 total), ~5-8 stops per route
- 15 students, 10 parents

### Totals

- 2 boards, 6 schools, 6 drivers, 6 buses
- 60 routes, ~300-400 stops
- 90 students, 60 parents

## Common Issues

### API Gateway Not Reachable During Reset

**Cause:** Services need time to start after reset
**Fix:** The reset script waits up to 90 seconds. If it still fails:

```bash
docker compose ps
docker compose logs api-gateway
docker compose down -v && docker compose up -d --build
```

### 403 Forbidden on Maps

**Cause:** Missing childRouteIds for parent users
**Fix:** Re-run `./scripts/reset-demo-db.sh`

### Maps Empty Despite Driver Running

**Cause:** Route not started via lifecycle event
**Check:** Ensure driver tapped "Start Route" in the Driver App

### Docker Containers Not Starting

**Cause:** Port conflicts or stale volumes
**Fix:** `docker compose down -v` then `docker compose up -d --build`

## Quick Health Checks

```bash
# All containers running
docker ps

# API Gateway health
curl http://localhost:3001/api/v1/health

# Route reference count (expect 60)
docker exec sbtm-postgres-1 psql -U postgres -d sbms -c "SELECT COUNT(*) FROM routes_reference;"

# Student count (expect 90)
docker exec sbtm-postgres-1 psql -U postgres -d sbms -c "SELECT COUNT(*) FROM students_reference;"

# Parent route assignments
docker exec sbtm-postgres-1 psql -U postgres -d sbms -c "SELECT email, \"childRouteIds\" FROM users WHERE role = 'PARENT' LIMIT 10;"
```

## Alert Governance API Endpoints (Phase B)

| Method | Endpoint                         | Role                    | Purpose                    |
| ------ | -------------------------------- | ----------------------- | -------------------------- |
| GET    | `/api/v1/alerts`                 | Any admin               | List all alerts            |
| GET    | `/api/v1/alerts/active`          | Any admin               | List active/pending alerts |
| PATCH  | `/api/v1/alerts/:id/confirm`     | School/Board/OSTA Admin | Confirm Tier 1 alert       |
| PATCH  | `/api/v1/alerts/:id/false-alarm` | School/Board/OSTA Admin | Mark as false alarm        |
| PATCH  | `/api/v1/alerts/:id/resolve`     | School/Board/OSTA Admin | Resolve an alert           |
| GET    | `/api/v1/alerts/:id/audit-trail` | School/Board/OSTA Admin | Full lifecycle audit trail |

## For More Details

- Full setup guide: [DEMO_SETUP_GUIDE.md](DEMO_SETUP_GUIDE.md)
- Live demo script: [LiveDemoScript.md](LiveDemoScript.md)
- Implementation docs: [docs/Implementation/](../Implementation/)
