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

If your work is primarily school-level daily dispatch, route oversight, and immediate incident handling, the [School Operator Guide](../school-operator/README.md) is the better operational reference.
