# SBTM User Guide -- Complete Reference

- Document owner: Product and Operations
- Last reviewed: 2026-04-14
- Primary use: Consolidated user guide combining all role-based and shared documentation into a single reference

This document merges all SBTM User Guide content into one file for convenient offline reading, printing, or full-text search. Each section below contains the complete, unmodified content of its source file.

---

## Table of Contents

1. [Master Index](#1-master-index) _(source: `docs/UserGuide/README.md`)_
2. [Admin Guide](#2-admin-guide) _(source: `docs/UserGuide/admin/README.md`)_
3. [Compliance and Support Guide](#3-compliance-and-support-guide) _(source: `docs/UserGuide/compliance-support/README.md`)_
4. [Driver Guide](#4-driver-guide) _(source: `docs/UserGuide/driver/README.md`)_
5. [Parent Guide](#5-parent-guide) _(source: `docs/UserGuide/parent/README.md`)_
6. [School Operator Guide](#6-school-operator-guide) _(source: `docs/UserGuide/school-operator/README.md`)_
7. [System Overview -- Shared Concepts](#7-system-overview----shared-concepts) _(source: `docs/UserGuide/shared/README.md`)_

---

---

## 1. Master Index

> **Source file:** `docs/UserGuide/README.md`

---

# SBTM User Guide — Master Index

- Document owner: Product and Operations
- Last reviewed: 2026-03-24
- Primary use: Role-based entry point for end-user and operator guidance

---

## Welcome to SBTM

The **School Bus Transport Management (SBTM)** platform gives Ontario school transport administrators, operators, drivers, and parents a unified system for managing school bus routes, tracking live GPS positions, monitoring student boarding, handling emergencies, and maintaining compliance records.

This guide helps you understand and use the system effectively, regardless of your role.

---

## How to Use This Guide

This guide is organized in two ways:

1. **Shared Content** — Foundational knowledge every SBTM user needs, regardless of role.
2. **Role-Specific Guides** — Tailored walkthroughs for your specific job function.

Start with the shared content if you are new to SBTM, then go to your role-specific guide.

---

## Shared Content (Start Here)

All users should read these sections first.

| Document                                       | Description                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| [System Overview & Concepts](shared/README.md) | What SBTM does, how the pieces fit together, roles, and terminology |

---

## Role-Specific Guides

Find your role and go to the guide that matches your job function.

### Parent

**You are responsible for**: Monitoring your child's bus location, receiving safety alerts, and confirming transport status.

| Document                         | Description                                                       |
| -------------------------------- | ----------------------------------------------------------------- |
| [Parent Guide](parent/README.md) | Your portal, live tracking, alert visibility, and troubleshooting |

### Driver

**You are responsible for**: Executing assigned routes, transmitting GPS position, recording student boarding/alighting, and triggering emergency alerts.

| Document                         | Description                                                               |
| -------------------------------- | ------------------------------------------------------------------------- |
| [Driver Guide](driver/README.md) | Route execution, GPS tracking, roster interaction, and emergency workflow |

### Admin (OSTA / Board Admin)

**You are responsible for**: Platform-wide oversight, fleet management, route configuration, and multi-school monitoring.

| Document                       | Description                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| [Admin Guide](admin/README.md) | Dashboard usage, tenant oversight, incident visibility, and data management |

### School Operator

**You are responsible for**: School-level daily dispatch, route setup, student roster management, and immediate incident response.

| Document                                           | Description                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| [School Operator Guide](school-operator/README.md) | Daily operations, route setup, fleet readiness, and incident response |

### Compliance & Support

**You are responsible for**: Compliance reviews, audit trail inspection, investigation support, and regulatory readiness.

| Document                                                   | Description                                               |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| [Compliance & Support Guide](compliance-support/README.md) | Audit review, compliance checks, investigation procedures |

---

## Business Use Case Reference Map

The table below maps key platform capabilities to the guide sections that cover them.

| Capability             | Description                                           | Guide Section                                                                  |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Authentication & Login | Sign in and receive role-appropriate access           | [System Overview](shared/README.md)                                            |
| Live GPS Tracking      | Real-time bus position on map                         | [Parent Guide](parent/README.md), [Driver Guide](driver/README.md)             |
| Student Presence       | Boarding and alighting tracking                       | [Driver Guide](driver/README.md), [School Operator](school-operator/README.md) |
| Emergency Alerts       | Panic button and incident workflow                    | [Driver Guide](driver/README.md), [Admin Guide](admin/README.md)               |
| Route Management       | Create, edit, assign routes and stops                 | [School Operator](school-operator/README.md), [Admin Guide](admin/README.md)   |
| Fleet Management       | Vehicle and driver assignment                         | [Admin Guide](admin/README.md), [School Operator](school-operator/README.md)   |
| Compliance & Audit     | Inspection records, driver certifications, audit logs | [Compliance & Support](compliance-support/README.md)                           |
| Parent Notifications   | Alert and status updates to parents                   | [Parent Guide](parent/README.md)                                               |
| Tenant Isolation       | Board/school-scoped data access                       | [System Overview](shared/README.md)                                            |

---

## Portal URLs (Default)

| Portal          | URL                   | Users                                 |
| --------------- | --------------------- | ------------------------------------- |
| Admin Dashboard | http://localhost:5173 | Admin, School Operator, Compliance    |
| Parent Portal   | http://localhost:5174 | Parents                               |
| Driver App      | Expo mobile app       | Drivers                               |
| API Gateway     | http://localhost:3001 | Backend entry point (not user-facing) |

---

## Quick Reference — Troubleshooting

| Issue                              | Action                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Cannot log in                      | Verify credentials from demo setup guide; re-run `./scripts/reset-demo-db.sh` |
| Map shows no bus movement          | Check browser console (F12) for 403 errors; verify simulator is running       |
| Alerts not appearing               | Verify emergency-alerts service is running; check API Gateway logs            |
| Child not showing in parent portal | Verify student-to-parent linking in database; re-run seed script              |
| Driver app cannot connect          | Check `EXPO_PUBLIC_API_URL` is set to `http://<host-ip>:3001/api/v1`          |

---

## Current-State Note

These guides describe the current system and call out partial or planned workflows explicitly. They should not be used to infer full production readiness. For implementation status, see [Gap Analysis](../prd/v1/GapAnalysis.md) and [Upgrade Plan](../prd/v1/UpgradePlan/README.md).

---

---

## 2. Admin Guide

> **Source file:** `docs/UserGuide/admin/README.md`

---

# Admin Guide

- Document owner: Product and Operations
- Last reviewed: 2026-04-06
- Primary use: Administrative guide for dashboard usage, tenant oversight, and incident visibility

---

## Your Role in SBTM

SBTM has four distinct admin roles arranged in a clear hierarchy:

**Role Hierarchy:** `SUPER_ADMIN` > `STA_ADMIN` > `BOARD_ADMIN` > `SCHOOL_ADMIN`

| Role                          | Scope                     | What You Manage                                                                                                                                |
| ----------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Super Admin**               | Platform-wide             | System bootstrap role with full access to all boards, schools, and operations. Can invite OSTA Admins and manage all users across the platform |
| **OSTA Admin**                | System-wide, cross-board  | Fleet ownership, vehicle-to-school assignment, system-wide compliance oversight, alert escalation, regulatory reporting                        |
| **Board Admin** (OCSB, OCDSB) | Board-level, cross-school | School lifecycle within your board, academic calendar, cross-school compliance, route change approval, incident report review                  |
| **School Admin**              | Single school             | Students, routes, stops, drivers, daily operations, alert confirmation, parent onboarding, pre-trip inspection review                          |

See [v4 Roles and Workflows](../../prd/v4/RolesAndWorkflows.md) for the full RACI responsibility matrix.

---

## Your Quick-Start Checklist

### Super Admin

- [ ] Sign in with your Super Admin credentials
- [ ] Review platform-wide dashboard for system health across all boards and schools
- [ ] Invite or manage OSTA Admins as needed
- [ ] Review all user accounts and roles across the platform
- [ ] Check organization management (boards and schools)

### OSTA Admin

- [ ] Sign in with your OSTA admin credentials
- [ ] Review system-wide dashboard for fleet status and alert counts
- [ ] Check for unassigned vehicles in the fleet pool
- [ ] Review any escalated alerts that School/Board Admins have not acknowledged
- [ ] Open the Compliance section for system-wide compliance overview
- [ ] Review fleet-to-school assignments pending your action

### Board Admin

- [ ] Sign in with your board admin credentials
- [ ] Review board-scoped dashboard for school status
- [ ] Check for pending route change approvals from School Admins
- [ ] Review cross-school compliance status for your board
- [ ] Check for escalated alerts from schools

### School Admin

- [ ] Sign in with your school admin credentials
- [ ] Review dashboard for active routes and alert counts
- [ ] Check for active emergency alerts requiring your confirmation (within 2 minutes)
- [ ] Review today's absence reports from parents
- [ ] Check pre-trip inspection results for today's routes
- [ ] Open Compliance to check for expiring driver credentials

---

## What You Can Do Today

| Capability                                      | Status                    | Available To        |
| ----------------------------------------------- | ------------------------- | ------------------- |
| Sign in to the admin dashboard                  | Available                 | All admins          |
| View dashboard tiles and live operational views | Available                 | All admins          |
| Manage routes, vehicles, students               | Available                 | OSTA, School        |
| View compliance and video metadata              | Available                 | All admins          |
| Monitor active alerts and emergency events      | Available                 | All admins          |
| Review audit trail                              | Available (service-local) | All admins          |
| Board and school CRUD management                | Available                 | OSTA, Board         |
| User invitation and provisioning                | Available                 | All admins (scoped) |
| Tenant overview dashboard                       | Available                 | OSTA, Board         |
| Absence management                              | Available                 | School              |
| Student bulk CSV import                         | Available                 | School              |
| Super Admin role                                | Available                 | Super Admin         |
| Role-based sidebar navigation                   | Available                 | All admins          |
| Fleet assignment workflow (propose/confirm)     | Available                 | OSTA, School        |
| Absence confirmation workflow                   | Available                 | School              |
| Organization management (boards/schools)        | Available                 | Super Admin, OSTA   |
| PDF document generation                         | Available                 | OSTA, School        |
| Confirm emergency alerts before parent delivery | Planned (v4)              | School              |
| Board Admin school creation                     | Planned (v4)              | Board               |
| Bulk route import from Excel/CSV                | Planned (v4)              | School              |
| SIS student data sync                           | Planned (v4)              | School              |
| OSTA fleet data sync                            | Planned (v4)              | OSTA                |
| Data export (CSV/PDF)                           | Planned (v4)              | All admins          |
| Cross-school compliance dashboard               | Planned (v4)              | OSTA, Board         |
| Academic calendar management                    | Planned (v4)              | Board               |
| Pre-trip inspection enforcement                 | Planned (v4)              | School              |
| Incident report generation (PDF)                | Planned (v4)              | School, Board       |
| Scheduled email reports                         | Planned (v4)              | All admins          |

## Typical Admin Workflows

### Daily (School Admin)

1. Sign in and review dashboard status.
2. Check pre-trip inspection results for today's routes. Follow up on failures.
3. Review absence reports from parents; confirm receipt.
4. Monitor active routes and alerts during operations.
5. Confirm emergency alerts within 2-minute window when they arrive.
6. Review end-of-day operations summary.

### Weekly (Board Admin)

1. Review weekly compliance summary for all schools in board.
2. Check for unresolved alerts from the past week.
3. Review and approve any pending route change requests from schools.
4. Review incident reports and sign off.

### Monthly (OSTA Admin)

1. Review system-wide compliance dashboard.
2. Review fleet utilization across all schools and boards.
3. Review alert statistics (volume, response times, false alarm rate).
4. Process any pending fleet reassignment requests.
5. Generate monthly report for regulatory submission.

## Alert Confirmation Workflow (v4)

When a safety-tier emergency alert arrives (PANIC, MEDICAL, INCIDENT):

1. School Admin receives immediate notification (WebSocket + push)
2. A confirmation modal appears with alert details (route, driver, location)
3. School Admin must respond within 2 minutes:
   - **Confirm and Notify Parents**: Alert broadcasts to all parents on the affected route via push + SMS
   - **Confirm as False Alarm**: Records as false alarm, no parent notification
   - **Request More Information**: Contacts driver, extends timer by 2 minutes
4. If School Admin does not respond within 2 minutes, alert auto-escalates to parents
5. Unacknowledged alerts further escalate: 5 min -> Board Admin, 15 min -> OSTA Admin

See [v4 Alert Strategy](../../prd/v4/AlertStrategy.md) for the complete alert tier model.

## Fleet Assignment Workflow (Phase C)

OSTA Admins manage vehicle-to-school assignments through a proposal-based workflow:

1. **OSTA Admin proposes** a fleet assignment by selecting a vehicle, route, and school.
2. The assignment is created with status **PROPOSED** and appears on the School Admin's Fleet Assignments page.
3. **School Admin reviews** the proposal and can:
   - **Accept**: Confirms the assignment. Status moves to **ACCEPTED**.
   - **Reject**: Declines the assignment with required notes explaining the reason. Status moves to **REJECTED**.
4. Accepted assignments can be **downloaded as PDF agreements** for record-keeping and compliance.

| Status       | Set By       | Description                                 |
| ------------ | ------------ | ------------------------------------------- |
| **PROPOSED** | OSTA Admin   | Assignment created, awaiting school review  |
| **ACCEPTED** | School Admin | School confirmed the assignment             |
| **REJECTED** | School Admin | School declined the assignment (with notes) |

## Absence Confirmation Workflow (Phase C)

Parents report student absences through the parent portal. School Admins review and action them:

1. **Parent reports** an absence via the parent portal for a specific date and reason.
2. The absence appears with status **PENDING** on the School Admin's Absences page.
3. **School Admin reviews** the absence and can:
   - **Confirm**: Validates the absence. Status moves to **CONFIRMED**. The student is automatically excluded from the driver's roster for the affected route(s).
   - **Reject**: Declines the absence with required notes. Status moves to **REJECTED**. The student remains on the roster.

| Status        | Set By       | Description                                            |
| ------------- | ------------ | ------------------------------------------------------ |
| **PENDING**   | Parent       | Absence reported, awaiting school review               |
| **CONFIRMED** | School Admin | Absence validated; student excluded from driver roster |
| **REJECTED**  | School Admin | Absence declined (with notes); student stays on roster |

## Role-Based Dashboard (Phase C)

The admin dashboard adapts its sidebar navigation based on the logged-in user's role. Each role sees only the pages relevant to their responsibilities:

| Role             | Visible Pages                                         |
| ---------------- | ----------------------------------------------------- |
| **Super Admin**  | All pages (full platform access)                      |
| **OSTA Admin**   | All pages (system-wide operations)                    |
| **Board Admin**  | Schools, Students, Alerts, Compliance                 |
| **School Admin** | Students, Routes, Alerts, Absences, Fleet Assignments |

This ensures a clean, focused experience: administrators are not overwhelmed by controls outside their scope, and sensitive operations are restricted to the appropriate role level.

## Key Business Use Cases You Cover

| Capability                          | Dashboard Section       |
| ----------------------------------- | ----------------------- |
| Fleet monitoring                    | Dashboard > Live Routes |
| Emergency response and confirmation | Dashboard > Alerts      |
| Student management and enrollment   | Students                |
| Route configuration and planning    | Routes / Route Planner  |
| Compliance audit and review         | Compliance > Audit      |
| Video review                        | Videos                  |
| Organization management             | Boards / Schools        |
| User provisioning                   | Users                   |
| Absence management                  | Absences                |

## When to Use the School Operator Guide Instead

If your work is primarily school-level daily dispatch, route oversight, and immediate incident handling, the [School Operator Guide](school-operator/README.md) is the better operational reference.

---

---

## 3. Compliance and Support Guide

> **Source file:** `docs/UserGuide/compliance-support/README.md`

---

# Compliance and Support Guide

- Document owner: Product and Operations
- Last reviewed: 2026-03-24
- Primary use: Compliance review, audit support, and operational investigation guidance

---

## Your Role in SBTM

As a **Compliance or Support** user, you review driver certifications, vehicle inspection histories, audit records, and support incident investigations. You ensure regulatory compliance and provide evidence when issues require escalation.

---

## Your Quick-Start Checklist

When conducting a review:

- [ ] Sign in with an authorized admin-capable role
- [ ] Open the Compliance section in the Admin Dashboard
- [ ] Review driver certification status and expiry dates
- [ ] Review vehicle inspection history
- [ ] Query audit logs for the relevant school or resource
- [ ] Document findings and escalation actions

---

## What You Can Do Today

| Capability                                         | Status    |
| -------------------------------------------------- | --------- |
| Review driver compliance records                   | Available |
| Review vehicle inspection history                  | Available |
| Query audit logs by school or resource             | Available |
| Support incident investigation with audit evidence | Available |
| Dedicated COMPLIANCE_OFFICER role                  | Planned   |
| Centralized audit pipeline                         | Planned   |
| Automated expiry reminders                         | Planned   |
| DSAR data export                                   | Planned   |

## Typical Workflow

1. Sign in with an authorized admin-capable role.
2. Open compliance and audit views.
3. Review driver certification or expiry information.
4. Review inspection history for affected vehicles.
5. Use audit records to understand change history or access patterns.

## Privacy and Investigation Notes

- Use student-linked operational data only when necessary for investigation or support.
- Prefer targeted resource queries over broad data review.
- Record follow-up actions when a compliance or incident issue requires escalation.

---

---

## 4. Driver Guide

> **Source file:** `docs/UserGuide/driver/README.md`

---

# Driver Guide

- Document owner: Product and Operations
- Last reviewed: 2026-04-14
- Primary use: Driver mobile workflow for route execution, GPS, and incident handling

---

## Your Role in SBTM

As a **Driver**, you are the primary field operator. You use the Driver App to execute assigned routes, transmit live GPS position to the platform, record student boarding and alighting, and trigger emergency alerts when needed.

---

## Your Quick-Start Checklist

When you start your shift:

- [ ] Sign in to the Driver App
- [ ] Complete pre-trip vehicle inspection checklist (v4: required before route start)
- [ ] Verify your assigned route appears on the schedule screen
- [ ] Select and start the route
- [ ] Allow GPS transmission (ensure location permissions are granted)
- [ ] Use the roster at each stop to record boardings
- [ ] Note any students marked as absent (reported by parents)
- [ ] End the route when complete

---

## What You Can Do Today

| Capability                                                  | Status       |
| ----------------------------------------------------------- | ------------ |
| Sign in to the driver app                                   | Available    |
| View assigned schedule or route                             | Available    |
| Start route and send GPS updates                            | Available    |
| Trigger emergency / panic alert                             | Available    |
| Report an incident                                          | Available    |
| View and respond to admin messages                          | Available    |
| Use roster for manual boarding/alighting                    | Available    |
| Board All / Alight All bulk actions                         | Available    |
| Offline GPS buffering                                       | Available    |
| BLE automatic student detection                             | Planned      |
| Pre-trip inspection checklist (required before route start) | Planned (v4) |
| View absent students on roster (parent-reported)            | Planned (v4) |
| Presence notifications to parents (auto on board/alight)    | Planned (v4) |

---

## Alert Types & When to Use Them

The system supports multiple alert types. As a driver, you can trigger two types directly:

### Alerts You Can Trigger

| Alert Type          | Button                          | When to Use                                                  | Example Use Case                                                                                                                      |
| ------------------- | ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Panic**           | Red PANIC button                | **Immediate danger** — driver or passenger safety is at risk | A vehicle collision occurs with students on board. You press PANIC immediately to summon emergency responders.                        |
| **Incident Report** | Orange "Report Incident" button | **Non-emergency event** that admin needs to know about       | A student fell while boarding and has a minor scrape. You report the incident so the school nurse is prepared and parent is notified. |

### Other Alert Types (System/Admin Created)

These are created automatically by the system or by school administrators:

| Alert Type          | Created By             | Example Use Case                                                            |
| ------------------- | ---------------------- | --------------------------------------------------------------------------- |
| **Route Deviation** | System (auto-detected) | GPS detects the bus has left its assigned route path — admin is alerted     |
| **Late Arrival**    | System (auto-detected) | Bus is running 10+ minutes behind schedule — parents and admin are notified |
| **Late Departure**  | System (auto-detected) | Bus did not leave origin by scheduled start time                            |
| **Route Diversion** | Admin (manual)         | Road construction ahead — admin creates a planned diversion notice          |
| **Medical**         | Admin (manual)         | Student has a medical episode — admin escalates to medical response         |
| **Compliance**      | System (auto-detected) | Vehicle speed exceeded limit — logged for compliance reporting              |

### Panic vs Incident — Key Differences

| Aspect                  | Panic Alert                                                     | Incident Report                                                   |
| ----------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Urgency**             | Immediate — real-time emergency                                 | Important but not life-threatening                                |
| **Admin notification**  | Instant push notification + sound                               | Standard notification                                             |
| **Escalation**          | Auto-escalates if not confirmed in 10 min                       | No auto-escalation                                                |
| **Parent notification** | After admin confirms                                            | At admin discretion                                               |
| **Example**             | Vehicle accident, threatening person, student medical emergency | Minor injury, property damage, student conflict, mechanical issue |

---

## Messages (Admin Communication)

The **Messages** screen allows two-way communication between you and the school admin during your route.

### How It Works

1. When an alert is active on your route, admin may click **"Request Info"** to ask for more details.
2. A badge appears on your **Messages** button showing the number of pending requests.
3. Tap **Messages** to see all active alerts and any info requests from admin.
4. Type a response and tap **Send** to reply.

### Example Scenarios

| Scenario              | Admin Message                                        | Your Response                                                |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| After a Panic alert   | "Can you describe the situation? Are students safe?" | "Minor fender-bender. No injuries. Police are on scene."     |
| After Route Deviation | "Why did you leave the route?"                       | "Road closed due to water main break. Taking Elm St detour." |
| After Late Arrival    | "What is causing the delay?"                         | "Heavy traffic on Highway 7. ETA 10 minutes."                |

---

## Typical Driver Workflow

### Current Workflow

1. Sign in.
2. Open the assigned route or schedule view.
   - Route card shows school name, direction (AM/PM), and start time.
3. Select and start the route.
   - **AM Route**: All students start as NOT_BOARDED. Use the roster to board students at each stop.
   - **PM Route**: All students start as BOARDED. Use the roster to alight students at their stops.
4. GPS tracking begins — your bus appears as a yellow arrow on the map.
5. Use the roster during stops (Board/Alight individual students, or use Board All / Alight All).
6. If an emergency occurs: press the red **PANIC** button.
7. To report a non-emergency incident: press the orange **Report Incident** button.
8. Check **Messages** for any info requests from admin and respond.
9. End the route — all remaining boarded students are automatically alighted.

### v4 Target Workflow

1. Sign in to the Driver App.
2. Select assigned route from schedule.
3. **Complete pre-trip inspection checklist** (brakes, lights, mirrors, tires, first aid kit, emergency exits, seatbelts). Submit result.
   - If all items pass: "Start Route" button becomes available.
   - If any item fails: Route start is blocked. School Admin is notified. Wait for guidance (maintenance or substitute vehicle).
4. Start route. School Admin is automatically notified that your route has begun.
5. At each stop:
   - View expected students for this stop.
   - Students marked as absent (by parent) are greyed out — do not wait for them.
   - Mark each boarding student (manual tap or BLE SmartTag auto-detect).
   - **Parent receives push notification**: "[Child] boarded bus at [Stop]".
6. At school (AM) or home stops (PM):
   - Mark each alighting student.
   - **Parent receives push notification**: "[Child] has arrived".
7. If emergency occurs: trigger PANIC button.
   - Alert goes to School Admin immediately.
   - School Admin confirms and parents are notified.
   - Continue following emergency procedures.
8. End route. System generates route summary (students boarded/alighted, stops visited, duration, any incidents).

## Important Reminders

> **Complete the pre-trip inspection honestly.** Failed items are safety issues that must be resolved before driving with students. (v4: inspection is enforced — you cannot start the route without passing.)

> **Use PANIC only for real emergencies.** For non-urgent events (minor injury, conflict, mechanical issue), use **Report Incident** instead.

> **Do not rely on BLE automation for attendance until that workflow is fully delivered.**

> **If connectivity is poor, continue using the app — events are buffered offline. Report sync issues through support after the route if needed.**

> **Check the roster for absent students before each stop.** If a parent has reported their child absent, the student will be greyed out. Do not wait at the stop for absent students.

> **Respond to admin Messages promptly.** When you see a badge on the Messages button, admin is waiting for information about an alert.

## Troubleshooting

| Problem                           | Solution                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------- |
| GPS not sending                   | Check that location permissions are granted; verify API URL is set correctly |
| Route not appearing               | Verify your driver account is assigned to a route in the database            |
| App cannot connect                | Set `EXPO_PUBLIC_API_URL` to `http://<host-ip>:3001/api/v1`                  |
| Emergency alert not sent          | Check network connectivity; verify API Gateway is running                    |
| Incident report failed            | Check network connectivity; the report is buffered offline for retry         |
| Messages not loading              | Pull to refresh; ensure internet connectivity                                |
| Pre-trip inspection not appearing | Feature available in v4; currently route start does not require inspection   |
| Absent students not shown         | Feature available in v4; currently all roster students shown as expected     |

---

---

## 5. Parent Guide

> **Source file:** `docs/UserGuide/parent/README.md`

---

# Parent Guide

- Document owner: Product and Operations
- Last reviewed: 2026-04-02
- Primary use: Parent-facing guide for child tracking, notifications, absence reporting, and safety visibility

---

## Your Role in SBTM

As a **Parent**, you use the Parent Portal to monitor your child's school bus in real time. You can see where the bus is, whether your child has boarded, receive safety alerts when something requires attention, report absences, and manage your notification preferences.

---

## Your Quick-Start Checklist

When you open the Parent Portal:

- [ ] Log in with your email and password
- [ ] Verify your children appear on the dashboard
- [ ] Select a child to open the live map view
- [ ] Check that the bus location is updating (green dot on map)
- [ ] Note any alert banners at the top of the screen
- [ ] Review your notification preferences in Settings (v4)
- [ ] Enable push notifications on your device/browser (v4)

---

## What You Can Do Today

| Capability                                        | Status       |
| ------------------------------------------------- | ------------ |
| Sign in to the parent portal                      | Available    |
| View children linked to your account              | Available    |
| Open live route tracking for a child              | Available    |
| Review current bus position on map                | Available    |
| Report child absence                              | Available    |
| View notification history                         | Available    |
| Receive push notifications for boarding/alighting | Planned (v4) |
| Receive push + SMS for emergency alerts           | Planned (v4) |
| Manage notification preferences                   | Planned (v4) |
| View ETA and next-stop detail                     | Planned (v4) |
| Receive route change notifications                | Planned (v4) |

## Typical Parent Workflow

### Current

1. Sign in to the parent portal.
2. Review the child cards on the dashboard.
3. Select a child and open the live map.
4. Watch the current bus position update.

### v4 Target Experience

**Morning (AM Route):**

1. Receive push notification when driver starts AM route (optional, configurable).
2. Receive push notification: "Bus is approximately 5 minutes from [Stop Name]" (v4).
3. Receive push notification: "[Child Name] boarded bus at [Stop Name] at 7:23 AM" (v4).
4. Open live map if desired to watch bus progress toward school.
5. Receive push notification: "[Child Name] has arrived at school at 7:48 AM" (v4).

**Afternoon (PM Route):**

1. Receive push notification when driver starts PM route (optional, configurable).
2. Open live map to track bus approaching your stop.
3. Receive push notification: "[Child Name] alighted from bus at [Stop Name] at 3:15 PM" (v4).

**Emergency:**

1. Receive push notification + SMS: "EMERGENCY on [Route Name]. Bus carrying [Child Name] has reported a [Incident Type] at [Time]. School has been notified. Updates will follow." (v4)
2. Open the parent portal for live updates.
3. Receive resolution notification when the situation is resolved: "Alert resolved. [Summary]." (v4)

**Absence Reporting:**

1. Open Parent Portal -> Absence Report page.
2. Select child, date, and route type (AM, PM, or Both).
3. Add optional notes (e.g., "doctor's appointment").
4. Submit. Receive confirmation: "Absence reported for [Child] on [Date]."
5. School Admin is notified. Driver's roster is updated.
6. To cancel: open the absence report and cancel before the route date.

## Notification Preferences (v4)

When v4 is delivered, you can configure your notification preferences in Settings:

| Setting                              | Options                        | Default      |  Can Disable?  |
| ------------------------------------ | ------------------------------ | ------------ | :------------: |
| Emergency alerts (safety)            | Push + SMS                     | Push + SMS   | No (always on) |
| Child boarding notification          | Push / In-app only / Off       | Push         |      Yes       |
| Child alighting notification         | Push / In-app only / Off       | Push         |      Yes       |
| Bus approaching your stop            | Push / Off                     | Push         |      Yes       |
| Route start/complete                 | Push / Off                     | Off          |      Yes       |
| Route changes affecting your child   | Push + Email / Email only      | Push + Email |       No       |
| Daily summary email                  | Email / Off                    | Off          |      Yes       |
| Quiet hours (suppress non-emergency) | Time range (e.g., 9 PM - 6 AM) | 9 PM - 6 AM  |      Yes       |

**Important:** Emergency alerts (PANIC, MEDICAL, INCIDENT) cannot be disabled and will always be delivered regardless of quiet hours or other settings. This is a safety requirement.

## Privacy and Consent (v4)

During your first login (after onboarding), you will be asked to:

1. Review the SBTM Privacy Notice explaining how your child's transport data is used.
2. Accept the consent form for child location tracking and notification delivery.
3. Your consent is recorded with a timestamp and the version of the privacy policy you accepted.
4. You can withdraw consent at any time through Settings. Withdrawing consent will disable tracking and notifications for your child. Contact your school admin to discuss implications.

## Troubleshooting

| Problem                          | Solution                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Live location looks stale        | The route may not have new GPS data yet; check that the bus route is active           |
| Child does not appear            | Verify that the account is linked to the correct student record; contact school admin |
| Not receiving push notifications | Enable notifications in browser/device settings; check preferences in Settings (v4)   |
| Expected a proactive alert       | Notification delivery is available from v4; check your notification preferences       |
| Map is blank                     | Check browser console (F12) for 403 errors; contact school admin                      |
| Absence report not reflected     | Allow a few minutes for sync; contact school admin if issue persists                  |

## Privacy Notes

- Parent access is limited to linked children and their route context.
- Tracking data should be viewed only for legitimate student-care and transport needs.
- Your notification preferences are respected for all non-emergency events.
- Your consent to child tracking can be withdrawn at any time.
- See [v4 Alert Strategy](../../prd/v4/AlertStrategy.md) for the complete notification model.

---

---

## 6. School Operator Guide

> **Source file:** `docs/UserGuide/school-operator/README.md`

---

# School Operator Guide

- Document owner: Product and Operations
- Last reviewed: 2026-03-24
- Primary use: School-level daily operations, route setup, and incident response

---

## Your Role in SBTM

As a **School Operator** (School Admin, dispatcher, or operations staff), you manage the day-to-day transport operations for your school. You set up routes, manage student rosters, monitor live bus positions, and respond to incidents.

---

## Your Quick-Start Checklist

Before service hours:

- [ ] Sign in to the Admin Dashboard
- [ ] Review active routes, students, and vehicle status
- [ ] Check compliance and inspection readiness
- [ ] Verify driver assignments are correct

During service hours:

- [ ] Monitor live map and GPS positions
- [ ] Watch for emergency alerts
- [ ] Check presence state as buses arrive at schools

---

## What You Can Do Today

| Capability                             | Status              |
| -------------------------------------- | ------------------- |
| Create or edit routes and stops        | Available           |
| Assign vehicles to routes              | Available           |
| Review student rosters                 | Available           |
| Monitor live GPS positions             | Available           |
| View alerts and emergency events       | Available           |
| Review presence state                  | Available (partial) |
| Inspect compliance and audit records   | Available           |
| Roster bulk import                     | Planned             |
| Route optimization                     | Demo quality        |
| Full tenant onboarding and invitations | Planned             |

## Daily Workflow

1. Sign in to the admin dashboard.
2. Review active routes, students, and vehicle status.
3. Check compliance and inspection readiness before route execution.
4. Monitor live map and alerts during service hours.
5. Investigate incidents, student issues, or route disruptions.

## Escalation Triggers

Act immediately when you see:

- Panic or emergency event from a driver
- Persistent GPS absence during an active route
- Missing or inconsistent student roster data before route start
- Compliance or inspection failure affecting a vehicle or driver

---

---

## 7. System Overview -- Shared Concepts

> **Source file:** `docs/UserGuide/shared/README.md`

---

# System Overview — What Is SBTM?

- Document owner: Product and Operations
- Last reviewed: 2026-03-24
- Primary use: Shared system overview, terminology, access model, and current-state caveats

---

## What Is SBTM?

The **School Bus Transport Management (SBTM)** platform is a multi-tenant transport operations system built for the Ontario School Transportation Authorities (OSTA). It manages school bus routes, tracks buses in real time, monitors student boarding and alighting, handles emergencies, and maintains compliance records — all through role-based web and mobile applications.

In plain terms: **SBTM shows you where every school bus is, whether students are on board, and alerts you immediately if something goes wrong.**

---

## How Does Data Flow Through SBTM?

```
┌─────────────────────────────────────────────────────────┐
│  FIELD DEVICES                                          │
│  Driver App (GPS) · BLE Tags (planned) · Manual Events  │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API calls
                        ▼
┌─────────────────────────────────────────────────────────┐
│  API GATEWAY (NestJS)                                   │
│  Authentication, RBAC, tenant isolation, rate limiting,  │
│  and request routing to downstream services              │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│ GPS      │ │ Student  │ │Emergency │ │ Other Services    │
│ Tracking │ │ Presence │ │ Alerts   │ │ (Student Mgmt,    │
│          │ │          │ │          │ │  Video, Compliance)│
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────────────┘
     │            │            │             │
     └────────────┴────────────┴─────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  PostgreSQL +    │
              │  Redis Queues    │
              └──────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  USER INTERFACES                                        │
│  Admin Dashboard (React) · Parent Portal (React)        │
│  Driver App (Expo/React Native)                          │
└─────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### Tenant Isolation

SBTM is **multi-tenant**. Every piece of data is scoped to a `school_id`. Users can only see data belonging to their school (or the schools they administer). The API Gateway enforces this at the request level.

### Roles

| Role         | Access Level                   | Primary App         |
| ------------ | ------------------------------ | ------------------- |
| STA_ADMIN    | Cross-board, system-wide       | Admin Dashboard     |
| BOARD_ADMIN  | Board-level (multiple schools) | Admin Dashboard     |
| SCHOOL_ADMIN | Single school                  | Admin Dashboard     |
| DRIVER       | Assigned routes only           | Driver App (mobile) |
| PARENT       | Linked children's routes only  | Parent Portal (web) |

### Route

A **route** is a defined sequence of stops, assigned to a vehicle and driver. Routes have GPS waypoints and expected durations.

### Presence Event

A **presence event** records when a student boards or alights a bus. Sources include manual driver input and (planned) BLE automatic detection.

### Emergency Event

An **emergency event** is a safety-critical alert triggered by the driver's panic button or by system-detected anomalies (e.g., route deviation, extended stop).

---

## Getting Started

### Logging In

1. Open your portal (Admin Dashboard, Parent Portal, or Driver App).
2. Enter your email and password.
3. After login, the system scopes your view based on your role and tenant.

### Demo Credentials

| Role         | Email                  | Password  |
| ------------ | ---------------------- | --------- |
| OSTA Admin   | sta.admin@sbtm.demo    | Admin123! |
| School Admin | school.admin@sbtm.demo | Admin123! |
| Driver 1     | driver1@sbtm.demo      | Admin123! |
| Parent 1     | parent1@sbtm.demo      | Admin123! |

---

## Current-State Caveats

- Parent notifications are still incomplete and largely polling-based.
- Driver roster interactions are not yet fully authoritative presence capture.
- Route optimization is currently placeholder quality.
- Board and school onboarding workflows remain incomplete.
- BLE-based automatic student detection is not yet completed.
- Centralized audit logging is service-local rather than fully consolidated.

---

## Safety and Privacy Reminders

- Student-linked operational data should only be accessed for legitimate service, support, or safety reasons.
- Incident review should stay within the user's role and tenant scope.
- All user interactions are logged for audit purposes.
- Incident review should stay within the user's role and tenant scope.
