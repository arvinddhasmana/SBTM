# SBTM Live Demo Guide

## Complete Step-by-Step Live Demo Script

This document provides a detailed script for conducting a live demonstration of the School Bus Transport Management System with real devices and users.

---

## Demo Overview

| Aspect | Details |
|--------|---------|
| **Duration** | 30-45 minutes |
| **Participants** | 2-3 Drivers, 3-4 Parents, 1 Admin |
| **Equipment** | Smartphones, Tablets, Laptop w/ large display |
| **Network** | Stable WiFi or mobile data |

---

## Pre-Demo Setup (15 min before)

### Step 1: Start Infrastructure
```powershell
# Navigate to project root
cd c:\Src\SBTM_AntiGravity

# Start all services
docker compose up -d

# Wait for health checks
docker compose ps

# Verify API is working
curl http://localhost:3001/api/v1/health
```

### Step 2: Seed Demo Data
```powershell
# Run the seed script
.\scripts\seed-demo-data.ps1
```

### Step 3: Start Frontend Applications

**Terminal 1 - Admin Dashboard:**
```powershell
cd apps/admin-dashboard
npm run dev
# Opens at http://localhost:5173
```

**Terminal 2 - Parent App:**
```powershell
cd apps/parent-app/web
npm run dev
# Opens at http://localhost:3000
```

### Step 4: Prepare Devices

| Device | App | User Account |
|--------|-----|--------------|
| Laptop/TV | Admin Dashboard | admin@sbtm.demo |
| Phone 1 | Driver App (Expo) | driver1@sbtm.demo |
| Phone 2 | Driver App (Expo) | driver2@sbtm.demo |
| Phone 3 | Parent App | parent1@sbtm.demo |
| Phone 4 | Parent App | parent2@sbtm.demo |
| Tablet | Parent App | parent3@sbtm.demo |

---

## Live Demo Script

### Scene 1: The Admin's Morning (5 min)

**Narrator:** "Let's see how a school transportation coordinator starts their day."

**Actions:**
1. Admin opens dashboard on large screen
2. Login: `admin@sbtm.demo` / `Admin123!`
3. Show **Fleet Overview** - all buses visible
4. Click on **BUS-001** - show bus details
5. Navigate to **Routes** - show today's schedule
6. Point out: "All 3 buses are ready, routes are configured"

**Key Points to Highlight:**
- Real-time fleet status
- Route management
- Driver assignments

---

### Scene 2: Driver Starts the Day (5 min)

**Narrator:** "Driver John is starting Route A. Let's see his experience."

**Actions:**
1. Driver picks up Phone 1
2. Opens Driver App (via Expo)
3. Login: `driver1@sbtm.demo` / `Driver123!`
4. Shows route list - selects "Route A - Lincoln AM"
5. Reviews route details and student manifest
6. Taps **"Start Route"**

**On Admin Screen simultaneously:**
- Show how bus icon appears on map
- Point out real-time position update

**Key Points:**
- Simple login process
- Clear route information
- One-tap route start

---

### Scene 3: Parents Track Their Children (5 min)

**Narrator:** "Meanwhile, parents are getting ready for the school bus."

**Actions:**
1. Parent 1 opens app on Phone 3
2. Login: `parent1@sbtm.demo` / `Parent123!`
3. Shows children listed: "Emma Wilson"
4. Taps on Emma → Live Map shows bus
5. Points out: "Bus is 10 minutes away"

**Do same with Parent 2:**
1. Login: `parent2@sbtm.demo`
2. Shows two children: "Liam" and "Olivia"
3. Points out different routes

**Key Points:**
- Parents see only their children
- Real-time location
- ETA to stop

---

### Scene 4: Student Boarding (7 min)

**Narrator:** "The bus is approaching Stop 1 where Emma is waiting."

**Driver Actions:**
1. Driver physically moves with phone (GPS updates)
2. Bus icon moves on all screens
3. Driver App shows "Approaching Stop 1"
4. Arrives at stop

**Parent Experience:**
1. Parent 1's phone shows notification: "Bus arriving at Emma's stop in 2 minutes"
2. After boarding simulation: "Emma has boarded the bus"

**Simulate Boarding:**
```powershell
# In a terminal, simulate SmartTag detection
$token = "<driver_token>"  # Get from login
curl -X POST http://localhost:3001/api/v1/student-presence-events `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"studentId":"STUDENT-001","vehicleId":"BUS-001","routeId":"ROUTE-A","eventType":"BOARD","source":"SMARTTAG"}'
```

**On Admin Screen:**
- Student list updates to show "Emma - BOARDED"
- Presence timestamp visible

**Key Points:**
- Automatic SmartTag detection
- Instant parent notification
- Real-time presence tracking

---

### Scene 5: Multiple Buses Operating (5 min)

**Narrator:** "Let's see how the admin monitors multiple buses simultaneously."

**Actions:**
1. Start Driver 2 on Phone 2 (driver2@sbtm.demo)
2. Driver 2 starts Route B
3. Admin dashboard now shows 2 buses moving
4. Point out ability to click any bus for details
5. Show filters by route, status

**Key Points:**
- Scalable to many buses
- Easy to monitor entire fleet
- Quick access to any bus details

---

### Scene 6: Emergency Response (7 min)

**Narrator:** "Safety is our top priority. Let's see what happens in an emergency."

**Actions:**
1. Driver 1 taps the **PANIC BUTTON** (large red button)
2. Confirms: "Yes, trigger emergency"
3. Selects type: "PANIC_BUTTON"

**Immediate Response:**
1. Admin screen shows **RED ALERT POPUP** with sound
2. Alert shows:
   - Bus location on map
   - Driver: John Driver
   - Route: Route A
   - Students on board: 2
3. Admin clicks alert → Full details view
4. Shows "Contact Driver" button
5. Admin acknowledges and resolves alert

**Parent Experience:**
1. Parents receive notification: "ALERT: An incident has occurred on Emma's bus"
2. App shows emergency indicator
3. After resolution: "Alert has been resolved"

**Key Points:**
- One-touch emergency trigger
- Immediate admin notification
- Full context provided
- Parent transparency

---

### Scene 7: Route Completion (3 min)

**Narrator:** "As the route completes, let's see the wrap-up process."

**Actions:**
1. Driver continues to school destination
2. Taps **"End Route"**
3. Summary shows:
   - Total students transported: 2
   - Route duration: 25 minutes
   - All students safely delivered

**Admin Screen:**
1. Bus marked as "Route Complete"
2. Trip log available in history
3. Can view analytics

---

### Demo Conclusion (3 min)

**Key Messages:**
1. ✅ Real-time GPS tracking
2. ✅ Automatic student presence detection
3. ✅ Instant parent notifications
4. ✅ Emergency response system
5. ✅ Complete visibility for administrators

**Q&A Time**

---

## Troubleshooting During Demo

### GPS Not Updating
```powershell
# Check GPS service
curl http://localhost:3002/health
# Restart if needed
docker compose restart gps-tracking
```

### Login Failures
- Verify services are running: `docker compose ps`
- Check API Gateway: `curl http://localhost:3001/api/v1/health`
- Re-run seed script if users missing

### No Notifications
- Ensure Parent App is connected
- Check browser console for WebSocket connection
- Verify CORS settings in API Gateway

---

## Fallback: Simulator Mode

If physical devices are unavailable, use the simulator:

```powershell
# Start simulator for Bus 1
.\scripts\simulate-demo.ps1 `
    -VehicleId "BUS-001" `
    -RouteId "ROUTE-A" `
    -SimulateBoarding `
    -IntervalSeconds 3

# In another terminal, start Bus 2
.\scripts\simulate-demo.ps1 `
    -VehicleId "BUS-002" `
    -RouteId "ROUTE-B" `
    -DriverEmail "driver2@sbtm.demo" `
    -IntervalSeconds 3
```

This will:
- Send GPS updates automatically
- Simulate student boardings at stops
- Allow admin to see moving buses

---

## Demo Checklist

### Before Demo
- [ ] All services running (`docker compose ps`)
- [ ] Database seeded with demo data
- [ ] Devices charged and connected to network
- [ ] Apps installed on all phones
- [ ] Large screen for admin dashboard
- [ ] Backup simulator script ready

### During Demo
- [ ] Keep admin dashboard visible at all times
- [ ] Have all login credentials ready
- [ ] Keep network stable
- [ ] Have backup device for each role

### After Demo
- [ ] Stop all services: `docker compose down`
- [ ] Reset demo data if needed
- [ ] Collect feedback from participants
