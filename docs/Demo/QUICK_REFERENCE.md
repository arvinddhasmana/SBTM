# Demo Quick Reference

## Fast Commands

### Complete Reset (Most Common)
```powershell
.\scripts\reset-demo-db.ps1
```

### Run Simulation
```powershell
.\scripts\simulate-demo.ps1 -IntervalSeconds 5 -Laps 3
```

### Verify Setup
```powershell
.\scripts\verify-demo.ps1
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| OSTA Admin | osta.admin@sbtm.demo | Admin123! |
| School Admin | school.admin@sbtm.demo | Admin123! |
| Driver 1 | driver1@sbtm.demo | Admin123! |
| Driver 2 | driver2@sbtm.demo | Admin123! |
| Driver 3 | driver3@sbtm.demo | Admin123! |
| Parent 1 | parent1@sbtm.demo | Admin123! |

## Portal URLs (Docker)

- Admin Dashboard: http://localhost:5173
- Parent Portal: http://localhost:5174
- API Gateway: http://localhost:3001

## Common Issues

### API Gateway Not Reachable During Reset
**Cause:** Services need time to start and become healthy after reset
**Fix:** The reset script now waits up to 90 seconds for services. If it still fails:
```powershell
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
**Fix:** Re-run `.\scripts\reset-demo-db.ps1`

### Maps Empty Despite Simulation Running
**Cause:** GPS data may not be persisted or authorization issue
**Check:** Run `.\scripts\verify-demo.ps1`

### Docker Containers Not Starting
**Cause:** Port conflicts or stale volumes
**Fix:** `docker compose down -v` then `docker compose up -d --build`

### Simulation Script Shows "GPS failed"
**Cause:** API Gateway not running or authentication issue
**Check:** `docker ps` to verify containers, check network connectivity

### Browser Console Shows 403 Errors
**Cause:** Authorization issues (missing childRouteIds or incomplete admin role checks)
**Fix:** Run `.\scripts\reset-demo-db.ps1` to apply authorization fixes

## Seeded Demo Data

### Routes
- ROUTE-A (BUS-001, driver1@sbtm.demo) - 4 stops
- ROUTE-B (BUS-002, driver2@sbtm.demo) - 4 stops
- ROUTE-C (BUS-003, driver3@sbtm.demo) - 3 stops

### Students
- STUDENT-001, 002, 004, 010 → ROUTE-A
- STUDENT-003, 005, 008, 009 → ROUTE-B
- STUDENT-006, 007 → ROUTE-C

### Parent-Route Mapping
- parent1@sbtm.demo → ROUTE-A
- parent2@sbtm.demo → ROUTE-B
- parent3@sbtm.demo → ROUTE-A
- parent4@sbtm.demo → ROUTE-B
- parent5@sbtm.demo → ROUTE-C
- parent6@sbtm.demo → ROUTE-B

## Troubleshooting Steps

### If Maps Don't Show Bus Movement

1. **Check browser console (F12)** for 403 errors
2. **Verify simulator is running** and shows green success messages
3. **Run verification:** `.\scripts\verify-demo.ps1`
4. **Check authorization tests** in verification output
5. **If all else fails:** `.\scripts\reset-demo-db.ps1`

### If No Alerts Appear

1. **Check simulator lap number** - Emergency alerts only appear every 3rd lap by default
2. **Refresh Admin Dashboard** manually
3. **Check API Gateway logs** for error messages
4. **Verify authentication** by logging out and back in

### If Data Looks Wrong

1. **Reset database:** `.\scripts\reset-demo-db.ps1`
2. **Verify seed data:** Check verification script output
3. **Check Docker logs:** `docker compose logs api-gateway`

## Quick Health Checks

```powershell
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
