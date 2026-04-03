# UC-FLEET-ASSIGN-001: Coordinate Fleet Assignment Between OSTA and School

- Document owner: Product and Delivery
- Last reviewed: 2026-04-02
- Status: Planned (v4 Phase C)
- Priority: Should

## Actors

- **OSTA Admin** (primary): Proposes vehicle-to-school-and-route assignment
- **School Admin** (primary): Reviews and accepts or rejects the proposed assignment
- **Driver** (informed): Notified of new vehicle assignment

## Features Traced

- FEAT-WORKFLOW-001 (Cross-Role Workflows)
- FEAT-ROUTE-001 (Route and Fleet Management)

## Requirements Traced

- FR-WORKFLOW-001
- FR-ROUTE-001

## Preconditions

- OSTA Admin is authenticated with system-wide access
- Vehicles exist in the fleet pool (imported from OSTA fleet DB or manually created)
- Target school and route exist in the system
- School Admin account is active for the target school

## Main Flow

1. OSTA Admin opens the Fleet Management view and selects an unassigned or reassignable vehicle.
2. OSTA Admin selects the target school and route for assignment.
3. OSTA Admin submits the assignment proposal with optional notes (e.g., "72-seat bus for high-capacity route").
4. System validates the proposal: vehicle is active, route does not already have a conflicting vehicle for the same time slot.
5. System creates an assignment proposal record with status PENDING.
6. System notifies School Admin: "Vehicle [license plate] ([make/model], [capacity] seats) proposed for Route [name] by OSTA Admin."
7. School Admin reviews the proposal: vehicle details, route details, capacity fit.
8. School Admin accepts the proposal.
9. System updates the route's vehicleId to the assigned vehicle.
10. System notifies OSTA Admin: "Assignment accepted by [School Admin name] at [School name]."
11. System notifies the assigned Driver: "You are assigned to Bus [license plate] on Route [name]."
12. System records the decision in the audit trail: who proposed, who accepted, when, with what notes.

## Alternative Flows

### School Admin Rejects

7a. School Admin rejects the proposal with comments (e.g., "Vehicle too small for 35-student route").
8a. System notifies OSTA Admin: "Assignment rejected. Reason: [comments]."
9a. OSTA Admin reviews rejection reason and revises the proposal with a different vehicle.
10a. Return to step 3 with revised proposal.

### Paper Trail Required

After step 12: 13. OSTA Admin or School Admin selects "Generate Assignment Agreement" from the proposal record. 14. System generates a PDF document containing: vehicle details, route details, proposal/acceptance dates, both parties' names. 15. Document is printed, physically signed by both parties. 16. Signed document is scanned and uploaded to the system, linked to the assignment record.

## Post-Conditions

- Vehicle is assigned to the specified route
- Driver is notified of the assignment
- Audit trail records the complete decision chain
- Previous vehicle assignment (if any) is released back to the fleet pool

## Current-State Notes

- Vehicle assignment is currently a direct update by any admin without coordination workflow
- No proposal/acceptance mechanism exists
- No audit trail for assignment decisions
- No PDF generation capability

## v4 References

- [Roles and Workflows](../../prd/v4/RolesAndWorkflows.md) - Section 3.1: Fleet Assignment Workflow
- [Gap Analysis](../../prd/v4/GapAnalysis.md) - GAP-ROLE-002, GAP-WF-001
