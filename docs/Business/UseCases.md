# SBTM Use Case Catalog

- Document owner: Product and Delivery
- Last reviewed: 2026-04-02
- Primary use: Master index for detailed natural-language use cases with stable identifiers and traceability

This document is the index for the SBTM use case set. Each use case now lives in its own file so agents and human readers can consume one workflow at a time without losing context. The individual files are natural-language-first and are intended to be independently readable.

## Related Documents

- [Requirements.md](Requirements.md)
- [Features.md](Features.md)
- [UserJourney.md](UserJourney.md)
- [../Design/SystemArchitecture.md](../Design/SystemArchitecture.md)
- [../Design/IntegrationArchitecture.md](../Design/IntegrationArchitecture.md)
- [../prd/GapAnalysis.md](../prd/GapAnalysis.md)
- [../prd/PhaseWiseImplementationPlan.md](../prd/PhaseWiseImplementationPlan.md)
- [../prd/v4/GapAnalysis.md](../prd/v4/GapAnalysis.md) (v4 Business Gap Analysis)
- [../prd/v4/RolesAndWorkflows.md](../prd/v4/RolesAndWorkflows.md) (v4 Roles and Workflows)

## Use Case Index

### Core Use Cases (Existing)

| ID                | Use Case                                            | Primary Actors                        | Status      | Detail File                                                                                                                       |
| ----------------- | --------------------------------------------------- | ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| UC-LOGIN-001      | Authenticate and enter role-specific workspace      | Admin, Driver, Parent                 | Implemented | [UC001_authenticate_and_enter_role_workspace.md](usecases/UC001_authenticate_and_enter_role_workspace.md)                         |
| UC-ONBOARD-001    | Onboard boards, schools, and scoped users           | OSTA Admin, Board Admin, School Admin | Partial     | [UC002_onboard_boards_schools_and_scoped_users.md](usecases/UC002_onboard_boards_schools_and_scoped_users.md)                     |
| UC-ROUTE-001      | Plan and manage routes, stops, and vehicles         | Dispatcher, School Admin              | Partial     | [UC003_plan_and_manage_routes_stops_and_vehicles.md](usecases/UC003_plan_and_manage_routes_stops_and_vehicles.md)                 |
| UC-MONITOR-001    | Monitor fleet, alerts, and operational health       | OSTA Admin, Board Admin, Dispatcher   | Partial     | [UC004_monitor_fleet_alerts_and_operational_health.md](usecases/UC004_monitor_fleet_alerts_and_operational_health.md)             |
| UC-DRIVER-001     | Execute the daily driver workflow                   | Driver                                | Partial     | [UC005_execute_daily_driver_workflow.md](usecases/UC005_execute_daily_driver_workflow.md)                                         |
| UC-PRESENCE-001   | Capture student boarding and alighting              | Driver, Student Presence Service      | Partial     | [UC006_capture_student_boarding_and_alighting.md](usecases/UC006_capture_student_boarding_and_alighting.md)                       |
| UC-PARENT-001     | Track children and receive safety communications    | Parent                                | Partial     | [UC007_track_children_and_receive_safety_communications.md](usecases/UC007_track_children_and_receive_safety_communications.md)   |
| UC-INCIDENT-001   | Respond to an in-route incident or emergency        | Driver, Admin, Parent                 | Partial     | [UC008_respond_to_in_route_incident_or_emergency.md](usecases/UC008_respond_to_in_route_incident_or_emergency.md)                 |
| UC-COMPLIANCE-001 | Maintain compliance, inspections, and audit history | Compliance Admin, Dispatcher          | Implemented | [UC009_maintain_compliance_inspections_and_audit_history.md](usecases/UC009_maintain_compliance_inspections_and_audit_history.md) |

### v4 Use Cases (Planned)

| ID                   | Use Case                                                | Primary Actors                        | Status  | Detail File                                                                                       | v4 Phase |
| -------------------- | ------------------------------------------------------- | ------------------------------------- | ------- | ------------------------------------------------------------------------------------------------- | -------- |
| UC-FLEET-ASSIGN-001  | Coordinate fleet assignment between OSTA and school     | OSTA Admin, School Admin              | Planned | [UC010_fleet_assignment_workflow.md](usecases/UC010_fleet_assignment_workflow.md)                 | Phase C  |
| UC-ALERT-CONFIRM-001 | Confirm and govern emergency alert delivery to parents  | School Admin, Board Admin, OSTA Admin | Planned | [UC011_alert_confirmation_and_governance.md](usecases/UC011_alert_confirmation_and_governance.md) | Phase B  |
| UC-DATAMIG-001       | Migrate legacy data and integrate with external systems | School Admin, OSTA Admin, Board IT    | Planned | [UC012_data_migration_and_integration.md](usecases/UC012_data_migration_and_integration.md)       | Phase D  |
| UC-PRETRIP-001       | Complete pre-trip inspection before route start         | Driver, School Admin                  | Planned | [UC013_pre_trip_inspection_enforcement.md](usecases/UC013_pre_trip_inspection_enforcement.md)     | Phase E  |
| UC-ABSENCE-001       | Report and manage student absence                       | Parent, School Admin, Driver          | Partial | [UC014_absence_reporting_workflow.md](usecases/UC014_absence_reporting_workflow.md)               | Phase C  |

## Reading Guidance

- Use this index when comparing scope and status across workflows.
- Use the individual use case files when writing requirements, tests, user guides, or implementation plans.
- Treat current-state caveats in each use case file as part of the documented behavior, not as incidental notes.
- v4 use cases reference the [v4 Roles and Workflows](../prd/v4/RolesAndWorkflows.md) for RACI responsibilities and the [v4 Alert Strategy](../prd/v4/AlertStrategy.md) for notification details.
