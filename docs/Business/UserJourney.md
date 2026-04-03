# SBTM User Journey (Current Implementation)

- Document owner: Product and UX
- Last reviewed: 2026-04-02
- Primary use: Business-facing walkthrough of the currently deliverable user experience

This document describes the currently deliverable user flow at a business level. For upgrade gaps and phase sequencing, use `docs/prd/GapAnalysis.md` and `docs/prd/PhaseWiseImplementationPlan.md`. For v4 target-state roles and workflows, see `docs/prd/v4/RolesAndWorkflows.md`.

## Related Documents

- [Requirements.md](Requirements.md)
- [UseCases.md](UseCases.md)
- [Features.md](Features.md)
- [GapAnalysis.md](../prd/GapAnalysis.md)
- [LiveDemoScript.md](../Demo/LiveDemoScript.md)
- [v4 Roles and Workflows](../prd/v4/RolesAndWorkflows.md)
- [v4 Alert Strategy](../prd/v4/AlertStrategy.md)

## Super Admin Journey (Web) - v4 Target

**Not yet implemented.** Target-state journey for initial system setup:

1. Deploy SBTM platform to production environment.
2. Run first-time setup wizard (or manual bootstrap via database).
3. Configure system settings: timezone (America/Toronto), region (Ontario), notification defaults.
4. Create initial OSTA Admin account.
5. Hand off to OSTA Admin for day-to-day operations.

**Notes:** After initial setup, the Super Admin role is used only for platform maintenance, version upgrades, and infrastructure issues. See [v4 Roles and Workflows](../prd/v4/RolesAndWorkflows.md) for full responsibility matrix.

## OSTA Admin Journey (Web)

**Current:**

1. Login to Admin Dashboard.
2. View system-wide dashboard with fleet map and alerts.
3. Manage boards and schools (create, view).
4. Manage vehicles (CRUD).
5. View compliance status across the system.

**v4 Target Additions:** 6. Import fleet data from OSTA fleet management system (sync or manual bulk import). 7. Propose vehicle-to-school-and-route assignments; School Admin confirms. 8. View system-wide compliance dashboard with drill-down by board and school. 9. Receive escalated alerts that School/Board Admins have not acknowledged. 10. Generate monthly fleet utilization and safety reports. 11. View audit trail for all workflow decisions across the system.

## Board Admin Journey (Web) - OCSB, OCDSB

**Current:**

1. Login to Admin Dashboard.
2. View board-scoped data (limited to own board).
3. View schools within board (read-only in current UI).

**v4 Target Additions:** 4. Create, modify, and deactivate schools within own board. 5. Create School Admin accounts for schools in own board. 6. Configure board-level academic calendar (holidays, PA days, exam days). 7. Review and approve major route changes proposed by School Admins. 8. View cross-school compliance status for own board. 9. Receive escalated alerts from School Admins. 10. Review and sign-off incident reports. 11. Generate weekly compliance summary reports.

## Admin Journey (Web)

1. Open Admin Dashboard (Vite app).
2. Login via API gateway and persist token in local storage.
3. View dashboard tiles, map, and alerts from live gateway data.
4. Review routes, students, presence, compliance, and videos.
5. Access basic board and school listing views.

**Notes:** Full board and school onboarding, invitations, and lifecycle management are still pending. The v4 plan differentiates OSTA Admin, Board Admin, and School Admin journeys with role-specific views and responsibilities.

## School Admin Journey (Web)

**Current:**

1. Login to Admin Dashboard.
2. View school-scoped dashboard (own school data).
3. Manage routes (create, view, modify via route planner).
4. Manage students (view, bulk import CSV).
5. View compliance (drivers, inspections, audit).
6. View and resolve alerts for own school.

**v4 Target Additions:** 7. Fully manage students: enroll, edit, withdraw (complete CRUD in UI). 8. Import students from SIS data export (with preview and approval). 9. Bulk import routes from Excel with geocoding and OSRM polyline generation. 10. Accept or reject vehicle assignments proposed by OSTA Admin. 11. Confirm emergency alerts before parent notification (within 2-minute window). 12. Manage driver accounts: create, assign to routes, view compliance. 13. Trigger parent invitation emails for student families. 14. Configure school settings: bell times, notification preferences. 15. View absence reports and confirm receipt to parents. 16. Review pre-trip inspection results; handle failed inspections. 17. Generate incident reports from resolved alerts. 18. Export data: student lists, route plans, compliance summaries (CSV/PDF).

## Driver Journey (Mobile)

1. Open Driver App (Expo).
2. Login via API gateway and receive a JWT.
3. View schedule via `/api/v1/driver/me/schedule`.
4. GPS updates are sent to `/api/v1/routes/locations`.
5. Trigger panic button to send emergency events.
6. Use the roster while presence integration is still partially local in the current UI.

**v4 Target Additions:** 7. Complete pre-trip vehicle inspection checklist before route start. Failed inspection blocks route start and alerts School Admin. 8. Start route (School Admin notified automatically). 9. At each stop: view expected students, mark boarding/alighting (manual or BLE SmartTag scan). Parent receives push notification for each event. 10. View absent students (greyed out on roster, reported by parents). 11. End route (summary generated: students boarded/alighted, stops visited, duration). 12. Emergency/panic button with offline buffering: events queued locally when offline, flushed on reconnection.

**Notes:** API base URL is configured via `EXPO_PUBLIC_API_URL`. The mobile app already includes offline buffering, but authoritative presence capture and BLE scanning are still upgrade work.

## Parent Journey (Web)

1. Open Parent Portal (Vite app).
2. Login via API gateway and persist token in local storage.
3. View children cards from `/api/v1/parent/children`.
4. Open live map; app polls `/api/v1/routes/:routeId/live-location`.

**v4 Target Additions:** 5. Receive push notification when child boards the bus: "[Child name] boarded bus [Route] at [Stop] at [Time]". 6. Receive push notification when child alights the bus. 7. Receive push + SMS for emergency alerts affecting child's route (after School Admin confirmation). 8. Report child absence for specific date and route type (AM/PM/BOTH). Receive confirmation when school acknowledges. 9. View notification history: all alerts, boarding events, route changes with read/unread status. 10. Configure notification preferences: which event types, which channels (push/email/SMS), quiet hours. Emergency alerts cannot be disabled. 11. During onboarding: accept privacy notice and consent form (recorded with timestamp and version). 12. View route change notifications before effective date.

**Notes:** The current experience is polling-based. Real notification delivery, notification history, and absence reporting are still pending. See [v4 Alert Strategy](../prd/v4/AlertStrategy.md) for the complete notification tier model and channel strategy.
