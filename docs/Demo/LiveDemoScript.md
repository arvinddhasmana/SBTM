# SBTM Live Demo Script

## Demo Overview
- Duration: 30-40 minutes
- Roles: Admin, Driver, Parent
- Devices: Laptop for admin, phone for driver, browser for parent

## Preparation (2 min)
Run the simulator after services and seed data are ready:

```powershell
.\scripts\simulate-demo.ps1 -IntervalSeconds 5 -Laps 3 -WithPresence
```

This generates live GPS movement, emergency alerts, and a simulated late notice.
Edit [scripts/demo-gps-track.json](../../scripts/demo-gps-track.json) to adjust routes or waypoints.
Use `-TrackName seeded-route-a-only` to focus on one route.
Use `-StrictSeedValidation` to ensure the track matches seeded IDs.

## Scene 1: Admin Overview (5 min)
1. Open Admin Dashboard.
2. Log in with `osta.admin@sbtm.demo` / `Admin123!`.
3. Show dashboard metrics, alerts, routes, and videos from live gateway data.
4. Open Compliance > Audit to show route start/completion entries from the simulator.
5. (Optional) Log out and log in as `school.admin@sbtm.demo` to narrate scope differences.

## Scene 2: Driver Starts Route (7 min)
1. Open Driver App (Expo).
2. Log in with `driver1@sbtm.demo` / `Admin123!`.
3. Select the mock route and start GPS tracking.
4. Trigger panic button to send an emergency event.

## Scene 3: Parent Tracking (7 min)
1. Open Parent Portal (web).
2. Log in with `parent1@sbtm.demo` / `Admin123!`.
3. Select a child card.
4. Show live map updates via polling.

## Scene 4: Presence Events (5 min)
1. Explain how Student Presence service records BLE/manual events.
2. (Optional) Send a manual event via API gateway:
```bash
curl -X POST http://localhost:3001/api/v1/student-presence-events \
  -H "Authorization: Bearer <driver-token>" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"STUDENT-001","vehicleId":"BUS-001","routeId":"ROUTE-A","eventType":"BOARD","timestamp":"2026-02-11T08:00:00Z","source":"MANUAL"}'
```

## Scene 5: Video Events (5 min)
1. Describe how video events are created and stored in the Video Service.
2. Show the Videos page in the Admin Dashboard.

## Wrap-up
- Highlight that backend services are live and the frontend apps use gateway APIs.
- Note that board/school management UI is pending.
- Confirm next steps for notifications and route optimization.
- Mention that late notifications are simulated as OTHER alerts in the demo.
- Run `./scripts/verify-demo.ps1` to validate seeded data and logins after setup.
