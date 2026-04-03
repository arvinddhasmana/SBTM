# SBTM Live Demo Script

- Document owner: Product, QA, and Engineering
- Last reviewed: 2026-04-02
- Primary use: Stakeholder-facing demo narrative and walkthrough script

This script is a presentation flow for stakeholders and internal walkthroughs. It is not the source of truth for implementation status. For verified current gaps and planned completion order, use `docs/prd/GapAnalysis.md` and `docs/prd/PhaseWiseImplementationPlan.md`. For v4 business enhancements, see `docs/prd/v4/GapAnalysis.md`.

## Related Documents

- [DEMO_SETUP_GUIDE.md](DEMO_SETUP_GUIDE.md)
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- [GapAnalysis.md](../prd/GapAnalysis.md)
- [TestingGuide.md](../Test/TestingGuide.md)
- [v4 Gap Analysis](../prd/v4/GapAnalysis.md)
- [v4 Alert Strategy](../prd/v4/AlertStrategy.md)

## Demo Overview

- Duration: 30-40 minutes
- Roles: Admin, Driver, Parent
- Devices: Laptop for admin, phone for driver, browser for parent

## Preparation (5 min)

### Step 1: Reset the demo database

This ensures a clean state before the demo:

```bash
./scripts/reset-demo-db.sh
```

Wait for completion and verify all checks pass.

### Step 2: Start the simulator

Run the simulator to generate live GPS movement, emergency alerts, and presence events:

```bash
./scripts/simulate-demo.sh --interval 5 --laps 3
```

Leave this running in a separate terminal window during the demo.

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
  -d '{"studentId":"STUDENT-001","vehicleId":"BUS-01","routeId":"ROUTE-R01","eventType":"BOARD","timestamp":"2026-02-11T08:00:00Z","source":"MANUAL"}'
```

## Scene 5: Video Events (5 min)

1. Describe how video events are created and stored in the Video Service.
2. Show the Videos page in the Admin Dashboard.

## Wrap-up

- Highlight that backend services are live and the frontend apps use gateway APIs.
- Note that some workflows shown in the demo are guided limitations rather than completed v1 product flows.
- Mention that late notifications are simulated as OTHER alerts in the demo.
- Run `./scripts/verify-demo.sh` to validate seeded data and logins after setup.

### Forward-Looking Narration Points (v4)

When presenting to stakeholders, use these talking points to describe upcoming capabilities:

- **Parent Notifications**: "In the next release, parents will receive push notifications the moment their child boards or alights the bus. Emergency alerts will also be delivered via SMS as a fallback."
- **Alert Governance**: "Emergency alerts will go through a confirmation workflow. School Admin will review the alert and confirm before it reaches parents, preventing false-alarm panic. If the admin doesn't respond within 2 minutes, the system auto-escalates."
- **Fleet Assignment**: "OSTA will be able to propose vehicle assignments to schools, and School Admins will review and accept or reject with comments, creating an auditable decision trail."
- **SIS Integration**: "Student data will sync from existing school board information systems, eliminating the need for duplicate data entry."
- **Bulk Route Import**: "Schools with hundreds of existing routes in Excel can import them in bulk, with automatic geocoding and OSRM road-following polyline generation."
- **Pre-Trip Inspection**: "Drivers will complete a mandatory inspection checklist before starting their route. Failed inspections block route start and alert the school admin."

See [v4 Upgrade Plan](../prd/v4/UpgradePlan.md) for the full delivery roadmap.

## Troubleshooting During Demo

### Maps Not Showing Bus Movement

- **Symptoms:** Map displays but no bus markers appear
- **Check:** Browser console (F12) for 403 Forbidden errors
- **Fix:** Re-run `./scripts/reset-demo-db.sh` to reset authorization data

### Emergency Alerts Not Appearing

- **Symptoms:** Simulator shows "Emergency PANIC alert sent" but Admin Dashboard doesn't show it
- **Check:** Verify simulator lap is divisible by EmergencyEvery parameter (default: every 3rd lap)
- **Fix:** Manually refresh Admin Dashboard page

### Parent Portal Shows "Offline"

- **Symptoms:** Portal shows "No active route" or "Offline" status
- **Check:** Verify simulator is running and shows green "BUS-01: Start" messages
- **Check:** Console for 403 errors on /routes/:routeId/live-location
- **Fix:** Verify parent user has childRouteIds populated (run verify-demo.sh)
