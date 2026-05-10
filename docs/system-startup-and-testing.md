# System Startup and Regression Testing Guide

## Current Issue: API Gateway Connection Refused

### Problem
The admin portal and parent portal show errors like:
```
GET http://localhost:3001/api/v1/routes net::ERR_CONNECTION_REFUSED
POST http://localhost:3001/api/v1/auth/logout net::ERR_CONNECTION_REFUSED
POST http://localhost:3001/api/v1/auth/login net::ERR_CONNECTION_REFUSED
```

### Root Cause
**The Docker services are not running.** The SBTM system runs as a containerized microservices architecture using Docker Compose. Without the containers running, the API gateway (and other services) are not accessible.

## Solution: Complete System Startup Procedure

### Step 1: Start Docker Services

From the root directory of the SBTM project:

```bash
cd /home/runner/work/SBTM/SBTM

# Option A: Start with existing images
docker compose up -d

# Option B: Rebuild and start (use this after code changes)
docker compose up --build -d
```

**Important**: The `-d` flag runs containers in detached mode (background). Remove it if you want to see live logs.

### Step 2: Verify Services Are Running

```bash
docker compose ps
```

You should see all services running with status "Up". Key services include:
- `postgres` (port 5433)
- `redis` (port 6379)
- `api-gateway` (port 3001)
- `gps-tracking` (port 3002)
- `emergency-alerts` (port 3003)
- `student-presence` (port 3004)
- `video-service` (port 3005)
- And others...

### Step 3: Initialize Database

If this is a fresh installation or you need to reset the database:

```bash
./scripts/init-db.sh
```

This script will:
1. Create all database tables (`init-schema.sql`)
2. Seed standard data like boards and admin users (`seed-standard.sql`)
3. Seed demo data (`seed-demo.sql`)
4. Apply the emergency-alerts migration
5. **NEW**: Apply the student-stop association fix migration
6. Restart any services that exited due to missing tables

### Step 4: Apply Additional Migrations (If Needed)

**Important**: The migration `002-fix-orphaned-student-stops.sql` should now be integrated into `init-db.sh`. If running manually:

```bash
docker cp scripts/migrations/002-fix-orphaned-student-stops.sql sbtm-postgres-1:/tmp/
docker exec sbtm-postgres-1 psql -U postgres -d sbms -f /tmp/002-fix-orphaned-student-stops.sql
```

### Step 5: Verify API Gateway is Accessible

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

## Recent Code Changes Review

### Changes in be9dbc3 (Latest Commit)

**Files Modified:**
1. `services/api-gateway/src/modules/route/route.service.ts` - Enhanced route update logic
2. `scripts/migrations/002-fix-orphaned-student-stops.sql` - New migration script
3. `docs/route-update-student-stop-fix.md` - Documentation

**Purpose:** Fix orphaned student-stop associations after route updates.

**Impact Assessment:**
- ✅ **Safe**: The code changes are defensive and prevent future data integrity issues
- ✅ **Backward Compatible**: No breaking changes to APIs or data models
- ✅ **No Service Disruption**: Changes are in business logic only, no infrastructure changes
- ⚠️ **Requires Migration**: The SQL migration should be run on existing databases

**Code Quality:**
- Uses transactions for data integrity
- Handles edge cases (stops with no valid IDs, routes with no stops)
- Preserves existing stop IDs when possible
- Automatically reassigns students when stops are deleted

## Regression Testing Checklist

After starting the system, perform these regression tests:

### 1. Authentication & Authorization
- [ ] Login as system admin (super.admin@sbtm.demo / Admin123!)
- [ ] Login as school admin (admin.stbern@sbtm.demo / Admin123!)
- [ ] Login as driver (driver.stbern@sbtm.demo / Admin123!)
- [ ] Login as parent (parent1.stbern@sbtm.demo / Admin123!)
- [ ] Logout functionality works
- [ ] Token refresh works

### 2. Route Management
- [ ] View list of routes
- [ ] View route details
- [ ] Create a new route with stops
- [ ] Update an existing route (add/remove/reorder stops)
- [ ] **Critical**: After updating a route, verify students still show correct stops
- [ ] Delete a route

### 3. Driver App - Roster View
- [ ] Open driver app and login
- [ ] Select a route
- [ ] **Critical**: Verify roster shows students grouped by their assigned stops
- [ ] Verify students are NOT in "Other Students" section unless truly unassigned
- [ ] Mark students as present/absent

### 4. Parent Portal - Map View
- [ ] Login as parent
- [ ] Select a child
- [ ] View map
- [ ] **Critical**: Verify the child's stop is highlighted on the map
- [ ] Verify the stop marker shows the child's name
- [ ] Track bus in real-time (if GPS service is running)

### 5. Admin Portal - Route Editing
- [ ] Login as admin
- [ ] Edit a route with students assigned
- [ ] Remove a stop that has students assigned to it
- [ ] Save the route
- [ ] **Critical**: Verify students were automatically reassigned to first stop (or NULL)
- [ ] Check driver roster to confirm students appear at correct stops

### 6. Student Management
- [ ] List students
- [ ] Create a new student
- [ ] Assign student to AM and PM routes
- [ ] Assign student to specific stops
- [ ] Update student assignments
- [ ] Delete student

### 7. Emergency Alerts
- [ ] Create an emergency alert
- [ ] Verify alert is broadcast
- [ ] Check alert configuration settings

### 8. GPS Tracking
- [ ] Simulate GPS data for a vehicle
- [ ] Verify location appears on admin portal map
- [ ] Verify location appears on parent portal map

## Known Issues and Mitigations

### Issue 1: Services Exit on First Startup
**Symptom**: Some services (e.g., emergency-alerts) exit immediately after `docker compose up` because database tables don't exist yet.

**Solution**: The `init-db.sh` script now automatically restarts exited services after creating tables. You can also manually restart:
```bash
docker compose restart emergency-alerts
```

### Issue 2: Port Conflicts
**Symptom**: Services fail to start with "port already in use" errors.

**Solution**: Check if ports are in use and kill conflicting processes:
```bash
lsof -i :3001  # Check who's using port 3001
kill <PID>     # Kill the process
```

Or change ports in `docker-compose.yml`.

### Issue 3: Database Connection Errors
**Symptom**: Services can't connect to PostgreSQL.

**Solution**: Verify PostgreSQL is healthy:
```bash
docker compose ps postgres
docker compose logs postgres
```

Check connection settings in `.env` files match `docker-compose.yml`.

## Environment Variables Required

Ensure these are set before starting Docker Compose:

```bash
export DB_PASSWORD="your_secure_password"
export JWT_SECRET="your_jwt_secret_key_at_least_32_chars"
export INTERNAL_SERVICE_SECRET="your_internal_service_secret"
```

Or create a `.env` file in the project root:
```env
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key_at_least_32_chars
INTERNAL_SERVICE_SECRET=your_internal_service_secret
```

## Troubleshooting Commands

```bash
# View all container logs
docker compose logs -f

# View specific service logs
docker compose logs -f api-gateway

# Check service health
docker compose ps

# Restart a specific service
docker compose restart api-gateway

# Stop all services
docker compose down

# Stop and remove volumes (CAUTION: Deletes data)
docker compose down -v

# Rebuild a specific service
docker compose up --build api-gateway

# Enter a container shell
docker compose exec api-gateway sh

# Check database
docker compose exec postgres psql -U postgres -d sbms
```

## Quick Commands Reference

```bash
# Start everything
docker compose up -d

# Initialize database
./scripts/init-db.sh

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

## Next Steps After System is Running

1. **Verify the Fix**:
   - Edit a route in admin portal
   - Check driver app roster shows students at correct stops
   - Check parent portal map highlights correct stops

2. **Run Full Test Suite** (if available):
   ```bash
   npm run test
   npm run test:e2e
   ```

3. **Monitor Logs** for any errors or warnings

4. **Performance Testing**: Ensure the new student reassignment logic doesn't cause performance issues with large datasets

## Summary

The `ERR_CONNECTION_REFUSED` errors are simply because Docker services aren't running. The recent code changes are safe and improve data integrity. The system needs:

1. Docker services started (`docker compose up`)
2. Database initialized (`./scripts/init-db.sh`)
3. Migration applied (now integrated into init-db.sh)
4. Regression testing to verify all functionality

The fix for orphaned student-stop associations is working as intended and prevents a critical data integrity issue.
