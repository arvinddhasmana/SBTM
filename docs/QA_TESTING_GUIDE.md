# SBTM QA Testing Guide

## Complete Testing Guide for Quality Assurance Engineers

This guide provides comprehensive test scenarios, test data, and verification steps for QA testing the School Bus Transport Management System.

---

## Testing Environment Setup

### Prerequisites Checklist
- [ ] Docker Desktop installed and running
- [ ] Node.js v20+ installed
- [ ] Git repository cloned
- [ ] All dependencies installed (`npm install`)
- [ ] PostgreSQL client (optional, for direct DB access)

### Setup Steps
```powershell
# 1. Clone and navigate
git clone https://github.com/arvinddhasmana/SBTM_AntiGravity.git
cd SBTM_AntiGravity

# 2. Start infrastructure
docker compose up -d

# 3. Wait for services (verify with)
docker compose ps

# 4. Seed test data
.\scripts\seed-demo-data.ps1

# 5. Start frontend apps (separate terminals)
cd apps/admin-dashboard && npm run dev
cd apps/parent-app/web && npm run dev
```

---

## Test Accounts

### Accounts by Role

| Role | Email | Password | Use Case |
|------|-------|----------|----------|
| **Admin** | admin@sbtm.demo | Admin123! | Full system access |
| **Admin** | supervisor@sbtm.demo | Admin123! | Secondary admin |
| **Driver** | driver1@sbtm.demo | Driver123! | BUS-001, Route A |
| **Driver** | driver2@sbtm.demo | Driver123! | BUS-002, Route B |
| **Driver** | driver3@sbtm.demo | Driver123! | BUS-003, Route C |
| **Parent** | parent1@sbtm.demo | Parent123! | Emma (Route A) |
| **Parent** | parent2@sbtm.demo | Parent123! | Liam & Olivia (Route A, B) |
| **Parent** | parent3@sbtm.demo | Parent123! | Noah (Route B) |
| **Parent** | parent4@sbtm.demo | Parent123! | Ava (Route C) |

---

## API Testing

### Base URLs
- API Gateway: `http://localhost:3001/api/v1`
- GPS Service: `http://localhost:3002`
- Emergency Alerts: `http://localhost:3003`
- Student Presence: `http://localhost:3004`
- Video Service: `http://localhost:3005`

### Authentication Tests

#### TC-AUTH-001: Valid Login
```bash
# Request
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sbtm.demo","password":"Admin123!"}'

# Expected Response (200)
{
  "accessToken": "<jwt_token>",
  "user": {
    "id": "...",
    "email": "admin@sbtm.demo",
    "role": "ADMIN"
  }
}
```

#### TC-AUTH-002: Invalid Password
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sbtm.demo","password":"wrongpassword"}'

# Expected Response (401)
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"
  }
}
```

#### TC-AUTH-003: Get Profile
```bash
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <token>"

# Expected: 200 with user profile
```

#### TC-AUTH-004: Missing Token
```bash
curl -X GET http://localhost:3001/api/v1/auth/me

# Expected: 401 Unauthorized
```

---

### GPS Tracking Tests

#### TC-GPS-001: Send Location (Driver)
```bash
# Login as driver first to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver1@sbtm.demo","password":"Driver123!"}' | jq -r '.accessToken')

# Send location
curl -X POST http://localhost:3002/api/v1/locations \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "BUS-001",
    "routeId": "ROUTE-A",
    "timestamp": "2025-12-17T12:00:00Z",
    "lat": 45.4215,
    "lng": -75.6972,
    "speedKph": 35,
    "headingDeg": 90,
    "accuracyMeters": 5
  }'

# Expected: 201 Created with { "status": "ok" }
```

#### TC-GPS-002: Get Live Location
```bash
curl -X GET "http://localhost:3001/api/v1/routes/ROUTE-A/live-location" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 with current bus position
```

#### TC-GPS-003: Get Location History
```bash
curl -X GET "http://localhost:3001/api/v1/routes/ROUTE-A/history?from=2025-12-16T00:00:00Z&to=2025-12-17T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 with array of location points
```

---

### Student Presence Tests

#### TC-PRES-001: Board Student (SMARTTAG)
```bash
# As driver
curl -X POST http://localhost:3001/api/v1/student-presence-events \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STUDENT-001",
    "vehicleId": "BUS-001",
    "routeId": "ROUTE-A",
    "eventType": "BOARD",
    "source": "SMARTTAG",
    "signalStrength": -55
  }'

# Expected: 201 Created
```

#### TC-PRES-002: Alight Student
```bash
curl -X POST http://localhost:3001/api/v1/student-presence-events \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STUDENT-001",
    "vehicleId": "BUS-001",
    "routeId": "ROUTE-A",
    "eventType": "ALIGHT",
    "source": "SMARTTAG"
  }'

# Expected: 201 Created
```

#### TC-PRES-003: Get Students on Route
```bash
curl -X GET http://localhost:3001/api/v1/routes/ROUTE-A/students \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 with student presence list
```

#### TC-PRES-004: Parent Access Control
```bash
# Parent 1 should only see their child's route
curl -X GET http://localhost:3001/api/v1/routes/ROUTE-B/students \
  -H "Authorization: Bearer $PARENT1_TOKEN"

# Expected: 403 Forbidden (Parent 1's child is on Route A, not B)
```

---

### Emergency Alerts Tests

#### TC-EMER-001: Trigger Panic Button
```bash
curl -X POST http://localhost:3001/api/v1/emergency-events \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "BUS-001",
    "routeId": "ROUTE-A",
    "driverId": "DRV-001",
    "eventType": "PANIC_BUTTON",
    "lat": 45.4215,
    "lng": -75.6972
  }'

# Expected: 201 Created with alert ID
```

#### TC-EMER-002: Get Active Alerts (Admin)
```bash
curl -X GET http://localhost:3001/api/v1/alerts/active \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: 200 with active alerts array
```

#### TC-EMER-003: Get Alert Details
```bash
curl -X GET http://localhost:3001/api/v1/alerts/<alert_id> \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: 200 with full alert details
```

---

## UI Testing Scenarios

### Admin Dashboard Tests

#### TC-UI-ADMIN-001: Login Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to http://localhost:5173 | Login page displayed |
| 2 | Enter admin@sbtm.demo | Email field populated |
| 3 | Enter Admin123! | Password field populated (masked) |
| 4 | Click Login | Redirect to Fleet Overview |
| 5 | Verify header | Shows "Welcome, Sarah Admin" |

#### TC-UI-ADMIN-002: Fleet Overview
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Fleet Overview | Map displayed with bus icons |
| 2 | Verify bus count | 3 buses visible (BUS-001, 002, 003) |
| 3 | Click on BUS-001 | Sidebar shows bus details |
| 4 | Verify details | Shows driver, route, status |

#### TC-UI-ADMIN-003: Emergency Alert Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger alert via API | Alert appears on dashboard |
| 2 | Verify alert styling | Red indicator, sound (if enabled) |
| 3 | Click alert | Alert details panel opens |
| 4 | Verify location | Map centers on alert location |

---

### Parent App Tests

#### TC-UI-PARENT-001: Login and Dashboard
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to http://localhost:3000 | Login page displayed |
| 2 | Login as parent1@sbtm.demo | Redirect to dashboard |
| 3 | Verify children list | "Emma Wilson" shown |
| 4 | Click on Emma | Live map displayed |

#### TC-UI-PARENT-002: Live Bus Tracking
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View live map | Bus icon visible (if active) |
| 2 | Verify route overlay | Route drawn on map |
| 3 | Verify ETA | "Arrives in X minutes" shown |
| 4 | Wait 10 seconds | Position updates visible |

#### TC-UI-PARENT-003: Access Control
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as parent1@sbtm.demo | Success |
| 2 | Try to view ROUTE-B | Access denied or not shown |
| 3 | Only Emma's route visible | Route A data only |

---

## Integration Test Scenarios

### TC-INT-001: End-to-End Route Simulation
**Objective:** Verify complete flow from driver start to parent tracking

| Step | Actor | Action | Verification |
|------|-------|--------|--------------|
| 1 | Driver | Login → Start Route A | Route starts |
| 2 | Admin | View dashboard | BUS-001 appears on map |
| 3 | Parent | Login → View child | Bus position visible |
| 4 | Driver | Move location | Position updates on all screens |
| 5 | System | SmartTag detection | Student marked as boarded |
| 6 | Parent | Check notifications | "Emma boarded" received |
| 7 | Driver | End route | Route marked complete |

### TC-INT-002: Emergency Flow
| Step | Actor | Action | Verification |
|------|-------|--------|--------------|
| 1 | Driver | Trigger panic button | Alert created |
| 2 | Admin | View dashboard | Red alert visible immediately |
| 3 | Admin | Click alert | Full details shown |
| 4 | Parent | Check app | Emergency notification received |
| 5 | Admin | Resolve alert | Status changes to RESOLVED |
| 6 | Parent | Check app | Resolution notification |

---

## Performance Testing

### Load Test Scenarios

#### LT-001: GPS Location Ingestion
- **Objective:** Verify system handles multiple simultaneous GPS updates
- **Setup:** 50 simulated buses sending locations
- **Rate:** 1 update per bus every 5 seconds
- **Expected:** All updates processed within 1 second

#### LT-002: Concurrent Parent Sessions
- **Objective:** Verify dashboard handles many concurrent users
- **Setup:** 100 simulated parent sessions
- **Actions:** Continuous map polling
- **Expected:** Response time < 500ms

---

## Database Verification Queries

### Verify Users Seeded
```sql
SELECT role, COUNT(*) as count 
FROM users 
WHERE email LIKE '%@sbtm.demo' 
GROUP BY role;

-- Expected:
-- ADMIN: 2
-- DRIVER: 3
-- PARENT: 4
```

### Verify Location Data
```sql
SELECT vehicle_id, COUNT(*) as points 
FROM location_points 
GROUP BY vehicle_id;
```

### Verify Presence Events
```sql
SELECT "eventType", COUNT(*) 
FROM presence_event 
GROUP BY "eventType";
```

---

## Bug Report Template

```markdown
### Bug ID: BUG-XXX

**Title:** Brief description

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Environment:**
- OS: Windows 11
- Browser: Chrome 120
- Docker: 24.0.5
- Node: 20.10.0

**Screenshots/Logs:**
Attach relevant files

**Additional Notes:**
Any other information
```

---

## Test Execution Checklist

### Pre-Test
- [ ] Services running (`docker compose ps`)
- [ ] Demo data seeded
- [ ] All apps accessible
- [ ] Test accounts verified

### During Testing
- [ ] Document all bugs found
- [ ] Take screenshots of failures
- [ ] Note any performance issues
- [ ] Verify cross-browser compatibility

### Post-Test
- [ ] Submit bug reports
- [ ] Update test results
- [ ] Clean up test data
- [ ] Report blockers immediately
