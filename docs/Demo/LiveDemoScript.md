# SBTM Live Demo Script

## Demo Overview
- Duration: 30-40 minutes
- Roles: Admin, Driver, Parent
- Devices: Laptop for admin, phone for driver, browser for parent

## Scene 1: Admin Overview (5 min)
1. Open Admin Dashboard.
2. Log in (any credentials; mock fallback).
3. Show dashboard metrics, alerts, routes, and videos.
4. Explain that data is mocked unless API gateway is configured.

## Scene 2: Driver Starts Route (7 min)
1. Open Driver App (Expo).
2. Log in with `driver@test.com` / `password`.
3. Select the mock route and start GPS tracking.
4. Trigger panic button to send an emergency event (if API base URL is configured).

## Scene 3: Parent Tracking (7 min)
1. Open Parent Portal (web).
2. Log in (mock login).
3. Select a child card.
4. Show simulated live map movement and ETA changes.

## Scene 4: Presence Events (5 min)
1. Explain how Student Presence service records BLE/manual events.
2. (Optional) Send a manual event via API gateway:
```bash
curl -X POST http://localhost:3001/api/v1/student-presence-events \
  -H "Authorization: Bearer <driver-token>" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"stud-001","vehicleId":"bus-001","routeId":"route-123","eventType":"BOARD","timestamp":"2026-02-10T08:00:00Z","source":"MANUAL"}'
```

## Scene 5: Video Events (5 min)
1. Describe how video events are created and stored in the Video Service.
2. Show the Videos page in the Admin Dashboard (demo data).

## Wrap-up
- Highlight that backend services are live and the frontend apps are demo-first.
- Note that multi-tenant features (boards/schools) are partially implemented in the API gateway.
- Confirm next steps for integrating parent/driver apps with real APIs.
