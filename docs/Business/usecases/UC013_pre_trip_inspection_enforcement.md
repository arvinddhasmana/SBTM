# UC-PRETRIP-001: Complete Pre-Trip Inspection Before Route Start

- Document owner: Product and Delivery
- Last reviewed: 2026-04-02
- Status: Planned (v4 Phase E)
- Priority: Should

## Actors

- **Driver** (primary): Completes inspection checklist before starting route
- **School Admin** (informed/action): Receives failed inspection alerts, arranges remediation

## Features Traced

- FEAT-PRETRIP-001 (Pre-Trip Enforcement)
- FEAT-COMPLIANCE-001 (Compliance and Audit)

## Requirements Traced

- FR-WORKFLOW-003
- FR-COMPLIANCE-001

## Preconditions

- Driver is authenticated and has an assigned route for today
- Pre-trip inspection checklist is configured for the vehicle type
- Driver's app has network connectivity (or inspection can be submitted when connectivity returns)

## Main Flow

1. Driver opens the Driver App and selects the assigned route.
2. System presents the pre-trip inspection checklist before showing the "Start Route" button. The checklist includes:
   - Brakes (service and parking)
   - Headlights and taillights
   - Turn signals and hazard lights
   - Interior and exterior mirrors
   - Tires (pressure, tread depth, damage)
   - Windshield wipers and fluid
   - Emergency exits and windows
   - First aid kit present and stocked
   - Fire extinguisher present and charged
   - Seatbelts functional
   - Interior cleanliness and safety
   - Stop arm and crossing gate (if equipped)
3. Driver inspects each item and marks it as PASS or FAIL.
4. For failed items, driver adds a brief note describing the issue (optional photo attachment).
5. Driver submits the inspection.

### All Items Pass

6a. System records the inspection result (VehicleInspection with type PRE_TRIP, is_passed: true).
7a. System enables the "Start Route" button.
8a. Driver starts the route normally.

### Any Item Fails

6b. System records the inspection result (VehicleInspection with type PRE_TRIP, is_passed: false, failed items in checklist_json).
7b. System disables the "Start Route" button. Message: "Route start blocked due to failed inspection items. Your school admin has been notified."
8b. System sends an alert to School Admin: "Pre-trip inspection FAILED for Bus [license plate] on Route [name]. Failed items: [list]. Driver: [name]."
9b. School Admin reviews the failed inspection in the Compliance -> Inspections tab.
10b. School Admin takes action: - Arranges maintenance for the vehicle, OR - Assigns a substitute vehicle to the route (if available), OR - Contacts the driver with instructions
11b. If a substitute vehicle is assigned, driver receives notification: "You have been reassigned to Bus [new license plate]. Please complete a new pre-trip inspection."
12b. Driver performs pre-trip inspection on the substitute vehicle (return to step 2).

## Post-Conditions

- Inspection record stored with pass/fail result, checklist details, and timestamp
- If passed: route start is enabled
- If failed: route start is blocked, School Admin is notified, remediation is tracked
- Audit trail records inspection submission and any subsequent vehicle reassignment

## Current-State Notes

- Vehicle inspections exist as records in the compliance service but are not linked to route lifecycle
- Driver can start a route without completing any inspection
- No inspection checklist UI in the driver app
- Inspection results are not enforced as a gate before route start

## v4 References

- [Roles and Workflows](../../prd/v4/RolesAndWorkflows.md) - Section 3.5: Pre-Trip Inspection and Route Start Workflow
- [Gap Analysis](../../prd/v4/GapAnalysis.md) - GAP-GOV-004
