# UC-ALERT-CONFIRM-001: Confirm and Govern Emergency Alert Delivery to Parents

- Document owner: Product and Delivery
- Last reviewed: 2026-04-02
- Status: Planned (v4 Phase B)
- Priority: Must

## Actors

- **Driver** (trigger): Initiates emergency event via panic button or incident report
- **School Admin** (primary): Receives, reviews, and confirms alert before parent delivery
- **Board Admin** (escalation): Receives escalated alerts if School Admin does not respond
- **OSTA Admin** (escalation): Receives further escalated alerts
- **Parent** (recipient): Receives confirmed emergency notification

## Features Traced

- FEAT-ALERT-GOV-001 (Alert Governance)
- FEAT-ALERTS-001 (Emergency Alerts)
- FEAT-NOTIFY-001 (Parent Notifications)

## Requirements Traced

- FR-ALERT-003, FR-ALERT-004, FR-ALERT-005
- NFR-PERF-002

## Preconditions

- Driver is on an active route with GPS tracking enabled
- School Admin is logged in or reachable via push notification
- Notification services (push, SMS, email) are configured and operational
- Parents of students on the route have active accounts with notification preferences set

## Main Flow

1. Driver triggers PANIC_BUTTON on the driver app (or system detects ROUTE_DEVIATION via geofence service).
2. System creates an EmergencyAlert record with status PENDING_CONFIRMATION.
3. System classifies the alert as Tier 1 (Safety) based on event type.
4. System immediately notifies School Admin via WebSocket (in-app) and push notification. Alert appears as a confirmation modal in the admin dashboard.
5. System sends informational copy to Board Admin and OSTA Admin (WebSocket only, no confirmation required from them at this stage).
6. School Admin reviews the modal showing: route name, vehicle, driver name, location on map, event type, timestamp.
7. School Admin selects "Confirm and Notify Parents."
8. System updates alert status to CONFIRMED.
9. System sends notifications to all parents of students on the affected route:
   - Push notification: "EMERGENCY: [event type] on [route name]. Bus carrying [child name] has reported a [event type] at [time]. School has been notified. Updates will follow."
   - SMS: Same message, abbreviated to 160 characters.
10. System logs notification delivery status for each parent (SENT/DELIVERED/FAILED per channel).
11. System records the confirmation in the audit trail: who confirmed, when, alert classification.

## Alternative Flows

### False Alarm

7a. School Admin selects "Confirm as False Alarm."
8a. System updates alert status to FALSE_ALARM.
9a. No notification is sent to parents.
10a. System records false alarm in audit trail for reporting.

### Request More Information

7b. School Admin selects "Request More Information."
8b. System extends the confirmation timer by 2 minutes.
9b. System sends a message to the driver app: "School admin is requesting more details about the emergency."
10b. Return to step 6, waiting for School Admin's follow-up action.

### Auto-Escalation (School Admin Timeout)

After step 4, if 2 minutes pass without School Admin response:
5a. System auto-escalates: sends notifications to parents (same as step 9).
6a. System logs the auto-escalation in audit trail.
7a. System notifies School Admin: "Alert auto-escalated to parents without your confirmation."
8a. System notifies Board Admin: "Emergency alert on [route] was auto-escalated (School Admin did not confirm within 2 minutes)."

### Further Escalation (Unacknowledged)

If alert remains unacknowledged by any admin:

- At 5 minutes: Board Admin receives escalation push + SMS.
- At 15 minutes: OSTA Admin receives escalation push + SMS + email.
- At 30 minutes: System marks the alert as CRITICAL_UNRESOLVED in the audit log.

## Resolution Flow

After the emergency is handled:

12. School Admin can add status updates (notes) to the confirmed alert at any time during active incident management. Each update is timestamped and recorded in the audit trail.
13. School Admin selects "Resolve Incident" and enters resolution notes.
14. System updates alert status to RESOLVED.
15. System sends notification to parents: "Alert resolved. [Summary of resolution]."
16. System prompts School Admin to generate an incident report (optional).
17. If incident report is generated, Board Admin is notified for review and sign-off.
18. RESOLVED and FALSE_ALARM alerts are removed from the Dashboard view (both Info and Action modes), along with their associated routes, buses, and boarded students.

## Alternative Flows

### Status Update (During Active Incident)

After step 8 (CONFIRMED):
9b. School Admin selects "Add Status Update" and enters operational notes (e.g., "Police on scene", "Replacement bus dispatched").
10b. System records the status update in the audit trail with timestamp, actor, and notes.
11b. System broadcasts the update to connected admin dashboard clients via WebSocket.
12b. Return to active incident view — admin can continue adding updates or resolve.

## Post-Conditions

- Alert is in CONFIRMED, FALSE_ALARM, or RESOLVED state
- All notification deliveries are logged with status
- Audit trail contains the complete alert lifecycle including any status updates
- Parents received (or did not receive, for false alarms) appropriate notifications
- Resolved/false alarm alerts are no longer visible on the operational Dashboard

## Current-State Notes

- Tier 1/2/3 alert classification implemented with auto-escalation chain
- Confirmation modal with countdown timer in admin dashboard
- Status update capability for CONFIRMED/ACTIVE/AUTO_ESCALATED alerts
- Resolve-with-notes endpoint for recording resolution details
- Dashboard filters out terminal alerts (RESOLVED, FALSE_ALARM) in both modes
- Audit trail records full lifecycle including STATUS_UPDATE events
- Parent notification delivery (push/SMS) is not yet implemented

## v4 References

- [Alert Strategy](../../prd/v4/AlertStrategy.md) - Complete alert tier model and confirmation workflow
- [Roles and Workflows](../../prd/v4/RolesAndWorkflows.md) - Section 3.2: Emergency Alert Confirmation Workflow
- [Gap Analysis](../../prd/v4/GapAnalysis.md) - GAP-WF-005, GAP-ALERT-001, GAP-ALERT-003, GAP-ALERT-006
