# SBTM Use Case Catalog

- Document owner: Product and Delivery
- Last reviewed: 2026-03-24
- Primary use: Master index for detailed natural-language use cases with stable identifiers and traceability

This document is the index for the SBTM use case set. Each use case now lives in its own file so agents and human readers can consume one workflow at a time without losing context. The individual files are natural-language-first and are intended to be independently readable.

## Related Documents

- [Requirements.md](Requirements.md)
- [Features.md](Features.md)
- [UserJourney.md](UserJourney.md)
- [../Design/v1/SystemArchitecture.md](../Design/v1/SystemArchitecture.md)
- [../Design/v1/IntegrationArchitecture.md](../Design/v1/IntegrationArchitecture.md)
- [../prd/v1/UpgradePlan/GapAnalysis.md](../prd/v1/UpgradePlan/GapAnalysis.md)
- [../prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md](../prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)

## Use Case Index

| ID | Use Case | Primary Actors | Status | Detail File |
| --- | --- | --- | --- | --- |
| UC-LOGIN-001 | Authenticate and enter role-specific workspace | Admin, Driver, Parent | Implemented | [UC001_authenticate_and_enter_role_workspace.md](usecases/UC001_authenticate_and_enter_role_workspace.md) |
| UC-ONBOARD-001 | Onboard boards, schools, and scoped users | OSTA Admin, Board Admin, School Admin | Partial | [UC002_onboard_boards_schools_and_scoped_users.md](usecases/UC002_onboard_boards_schools_and_scoped_users.md) |
| UC-ROUTE-001 | Plan and manage routes, stops, and vehicles | Dispatcher, School Admin | Partial | [UC003_plan_and_manage_routes_stops_and_vehicles.md](usecases/UC003_plan_and_manage_routes_stops_and_vehicles.md) |
| UC-MONITOR-001 | Monitor fleet, alerts, and operational health | OSTA Admin, Board Admin, Dispatcher | Partial | [UC004_monitor_fleet_alerts_and_operational_health.md](usecases/UC004_monitor_fleet_alerts_and_operational_health.md) |
| UC-DRIVER-001 | Execute the daily driver workflow | Driver | Partial | [UC005_execute_daily_driver_workflow.md](usecases/UC005_execute_daily_driver_workflow.md) |
| UC-PRESENCE-001 | Capture student boarding and alighting | Driver, Student Presence Service | Partial | [UC006_capture_student_boarding_and_alighting.md](usecases/UC006_capture_student_boarding_and_alighting.md) |
| UC-PARENT-001 | Track children and receive safety communications | Parent | Partial | [UC007_track_children_and_receive_safety_communications.md](usecases/UC007_track_children_and_receive_safety_communications.md) |
| UC-INCIDENT-001 | Respond to an in-route incident or emergency | Driver, Admin, Parent | Partial | [UC008_respond_to_in_route_incident_or_emergency.md](usecases/UC008_respond_to_in_route_incident_or_emergency.md) |
| UC-COMPLIANCE-001 | Maintain compliance, inspections, and audit history | Compliance Admin, Dispatcher | Implemented | [UC009_maintain_compliance_inspections_and_audit_history.md](usecases/UC009_maintain_compliance_inspections_and_audit_history.md) |

## Reading Guidance

- Use this index when comparing scope and status across workflows.
- Use the individual use case files when writing requirements, tests, user guides, or implementation plans.
- Treat current-state caveats in each use case file as part of the documented behavior, not as incidental notes.
