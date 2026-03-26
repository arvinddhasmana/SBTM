# Demo Quick Reference

- Document owner: QA and Engineering
- Last reviewed: 2026-03-24
- Primary use: Fast operational checklist for demo setup and troubleshooting

This is the fast operational companion to `DEMO_SETUP_GUIDE.md`. For feature gaps or upgrade status, use `docs/prd/GapAnalysis.md`.

## Related Documents

- [DEMO_SETUP_GUIDE.md](DEMO_SETUP_GUIDE.md)
- [LiveDemoScript.md](LiveDemoScript.md)
- [GapAnalysis.md](../prd/GapAnalysis.md)
- [TestingGuide.md](../Test/TestingGuide.md)

## Fast Commands

### Complete Reset (Most Common)
```bash
./scripts/reset-demo-db.sh
```

### Run Simulation
```bash
./scripts/simulate-demo.sh --interval 5 --laps 3
```

### Verify Setup
```bash
./scripts/verify-demo.sh
```

## Demo Credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| OSTA Admin | osta.admin@sbtm.demo | Admin123! | Cross-board oversight |
| School Admin (School 1) | school.admin@sbtm.demo | Admin123! | Greenfield Elementary |
| School Admin (School 2) | school2.admin@sbtm.demo | Admin123! | Riverside Academy |
| Live Driver 1 | driver1@sbtm.demo | Admin123! | ROUTE-R01 (School 1) ☆ |
| Live Driver 2 | driver2@sbtm.demo | Admin123! | ROUTE-R02 (School 1) ☆ |
| Live Driver 11 | driver11@sbtm.demo | Admin123! | ROUTE-R11 (School 2) ☆ |
| Live Driver 12 | driver12@sbtm.demo | Admin123! | ROUTE-R12 (School 2) ☆ |
| Parent 1 | parent1@sbtm.demo | Admin123! | Kids on R01, R02 |
| Parent 2 | parent2@sbtm.demo | Admin123! | Kids on R01, R03 |
| Parent 3 | parent3@sbtm.demo | Admin123! | Kids on R11, R12 |

☆ = Live driver (install Driver app on phone, use real GPS)

All 20 drivers (driver1–driver20@sbtm.demo) and 10 parents (parent1–parent10@sbtm.demo) exist.

## Portal URLs (Docker)

- Admin Dashboard: http://localhost:5173
- Parent Portal: http://localhost:5174
- API Gateway: http://localhost:3001

## Common Issues

### API Gateway Not Reachable During Reset
**Cause:** Services need time to start and become healthy after reset
**Fix:** The reset script now waits up to 90 seconds for services. If it still fails:
```bash
# Check service status
docker compose ps

# Check specific service logs
docker compose logs api-gateway
docker compose logs student-presence
docker compose logs postgres

# If student-presence is failing with ENUM errors, ensure you ran the latest reset
# If services are crashing, try a full rebuild
docker compose down -v
docker compose up -d --build
```

### 403 Forbidden on Maps
**Cause:** Missing childRouteIds for parent users or admin role check issue
**Fix:** Re-run `./scripts/reset-demo-db.sh`

### Maps Empty Despite Simulation Running
**Cause:** GPS data may not be persisted or authorization issue
**Check:** Run `./scripts/verify-demo.sh`

### Docker Containers Not Starting
**Cause:** Port conflicts or stale volumes
**Fix:** `docker compose down -v` then `docker compose up -d --build`

### Simulation Script Shows "GPS failed"
**Cause:** API Gateway not running or authentication issue
**Check:** `docker ps` to verify containers, check network connectivity

### Browser Console Shows 403 Errors
**Cause:** Authorization issues (missing childRouteIds or incomplete admin role checks)
**Fix:** Run `./scripts/reset-demo-db.sh` to apply authorization fixes

## Seeded Demo Data

### Schools
- Greenfield Elementary (Glebe area, 45.3876, -75.6960) — 10 routes, 10 buses
- Riverside Academy (Westboro area, 45.3960, -75.7300) — 10 routes, 10 buses

### Routes (20 total, 5 stops each, 100 stops total)
| Routes | Vehicles | School |
|--------|----------|--------|
| ROUTE-R01 – ROUTE-R10 | BUS-01 – BUS-10 | Greenfield Elementary |
| ROUTE-R11 – ROUTE-R20 | BUS-11 – BUS-20 | Riverside Academy |

### Live Driver Routes (highlighted on map with gold pulsing border)
- ROUTE-R01 (BUS-01, driver1@sbtm.demo) — Bank Street South
- ROUTE-R02 (BUS-02, driver2@sbtm.demo) — Bronson Avenue
- ROUTE-R11 (BUS-11, driver11@sbtm.demo) — Richmond Road
- ROUTE-R12 (BUS-12, driver12@sbtm.demo) — Scott Street

### Students
- 500 students (STUDENT-001 – STUDENT-500), 25 per route
- First 15 students (STUDENT-001 – STUDENT-015) are tracked by parent logins

### Parents (10, tracking 15 kids)
- parent1: kids on ROUTE-R01, ROUTE-R02
- parent2: kids on ROUTE-R01, ROUTE-R03
- parent3: kids on ROUTE-R11, ROUTE-R12
- parent4–parent10: various routes (see init-db.sql)

### Parent-Route Mapping
- parent1@sbtm.demo → ROUTE-R01, ROUTE-R02
- parent2@sbtm.demo → ROUTE-R01, ROUTE-R03
- parent3@sbtm.demo → ROUTE-R11, ROUTE-R12
- parent4@sbtm.demo → ROUTE-R04
- parent5@sbtm.demo → ROUTE-R05, ROUTE-R06
- parent6@sbtm.demo → ROUTE-R11
- parent7@sbtm.demo → ROUTE-R13
- parent8@sbtm.demo → ROUTE-R07
- parent9@sbtm.demo → ROUTE-R14, ROUTE-R15
- parent10@sbtm.demo → ROUTE-R08

## Troubleshooting Steps

### If Maps Don't Show Bus Movement

1. **Check browser console (F12)** for 403 errors
2. **Verify simulator is running** and shows green success messages
1. **Run verification:** `./scripts/verify-demo.sh`
4. **Check authorization tests** in verification output
1. **If all else fails:** `./scripts/reset-demo-db.sh`

### If No Alerts Appear

1. **Check simulator lap number** - Emergency alerts only appear every 3rd lap by default
2. **Refresh Admin Dashboard** manually
3. **Check API Gateway logs** for error messages
4. **Verify authentication** by logging out and back in

### If Data Looks Wrong

1. **Reset database:** `./scripts/reset-demo-db.sh`
2. **Verify seed data:** Check verification script output
3. **Check Docker logs:** `docker compose logs api-gateway`

## Quick Health Checks

```bash
# Check if all containers are running
docker ps

# Check API Gateway health
curl http://localhost:3001/api/v1/health

# Check GPS data in database
docker exec sbtm_antigravity-postgres-1 psql -U postgres -d sbms -c "SELECT COUNT(*) FROM location_points;"

# Check parent user has routes assigned
docker exec sbtm_antigravity-postgres-1 psql -U postgres -d sbms -c "SELECT email, \"childRouteIds\" FROM users WHERE role = 'PARENT';"
```

## For More Details

- Full setup guide: [DEMO_SETUP_GUIDE.md](DEMO_SETUP_GUIDE.md)
- Live demo script: [LiveDemoScript.md](LiveDemoScript.md)
- Implementation docs: [docs/Implementation/](../Implementation/)

