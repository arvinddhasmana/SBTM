# UC-ABSENCE-001: Report and Manage Student Absence

- Document owner: Product and Delivery
- Last reviewed: 2026-04-02
- Status: Partial (absence reporting exists, confirmation workflow and driver roster integration planned for v4 Phase C)
- Priority: Should

## Actors

- **Parent** (primary): Reports child absence for a specific date and route
- **School Admin** (informed/action): Receives absence report, confirms receipt
- **Driver** (informed): Sees absent students on route roster (greyed out)
- **System** (automated): Updates roster, sends confirmations

## Features Traced

- FEAT-PARENT-002 (Parent Exception Handling)
- FEAT-PRESENCE-001 (Student Presence)

## Requirements Traced

- FR-PARENT-003
- PR-CONSENT-001

## Preconditions

- Parent is authenticated and linked to at least one child
- Child is assigned to a route with upcoming service
- Absence report date is today or a future date

## Main Flow

1. Parent opens the Parent Portal and navigates to the Absence Report page.
2. Parent selects the child to report absent.
3. Parent selects the date of absence.
4. Parent selects the route type: AM only, PM only, or BOTH.
5. Parent optionally adds notes (e.g., "doctor's appointment," "family trip").
6. Parent submits the absence report.
7. System creates an absence record (StudentAbsence entity).
8. System sends confirmation to parent: "Absence reported for [child name] on [date] ([route type])."
9. System notifies School Admin: "[Child name] reported absent for [date] ([route type]) by [parent name]."
10. System updates the driver's route roster for the affected route(s): the student is marked as ABSENT and greyed out.

### Route Day

11. Driver opens the roster for the route.
12. Driver sees the absent student greyed out with label: "Absent (reported by parent)."
13. Driver does not wait at the student's stop (if the student is the only expected pickup at that stop).
14. If other students are expected at the same stop, driver still stops for them.

## Alternative Flows

### Cancel Absence

After step 8:
9a. Parent opens the absence report before the route date and selects "Cancel."
10a. System deletes the absence record.
11a. System notifies School Admin: "Absence cancelled for [child name] on [date]."
12a. System restores the student on the driver's roster (no longer greyed out).

### Absence Report After Route Has Started

If the parent tries to report absence for a route that has already started:
3a. System displays warning: "The [AM/PM] route has already started. This absence report will not affect today's roster."
4a. Parent can still submit for record purposes, but the driver's roster is not updated mid-route.

### School Admin Manages Absence (Admin View)

1b. School Admin opens Admin Dashboard -> Absences.
2b. School Admin selects a date to view all absence reports for that day.
3b. School Admin sees a table of absences: child name, route, type, parent, notes, timestamp.
4b. School Admin can delete an absence report if it was submitted in error (with audit trail).

## Post-Conditions

- Absence record exists in the system for the specified date
- Driver's roster reflects the absence (student greyed out)
- Parent received confirmation
- School Admin received notification
- Audit trail records the absence report and any cancellation

## Current-State Notes

- Absence reporting API and UI exist (Parent App and Admin Dashboard)
- Parent can submit absence reports and School Admin can view/delete them
- **Gap**: No confirmation notification is sent back to the parent
- **Gap**: Absence reports do not automatically update the driver's roster
- **Gap**: Driver app does not display which students are absent

## v4 References

- [Roles and Workflows](../../prd/v4/RolesAndWorkflows.md) - Section 3.6: Absence Reporting Workflow
- [Gap Analysis](../../prd/v4/GapAnalysis.md) - GAP-ROLE-006
