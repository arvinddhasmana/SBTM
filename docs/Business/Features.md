# SBTM Feature Matrix

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: At-a-glance business-facing capability status

This matrix describes business-facing capability status at a high level. For detailed implementation status and verified gaps, use `docs/Implementation/*` and `docs/prd/v1/UpgradePlan/GapAnalysis.md`.

## Related Documents

- [Requirements.md](Requirements.md)
- [UseCases.md](UseCases.md)
- [UserJourney.md](UserJourney.md)
- [GapAnalysis.md](../prd/v1/UpgradePlan/GapAnalysis.md)
- [Implementation](../Implementation)

## Feature Status

| Area | Feature | Status | Notes |
| --- | --- | --- | --- |
| Identity | JWT auth + RBAC | Implemented | In API gateway; includes OSTA/Board/School roles |
| Multi-tenancy | School boards and schools | Implemented | Gateway enforces board/school scopes; services filter by `school_id` |
| GPS Tracking | Location ingest + live/history | Implemented | GPS service with Prisma and REST APIs |
| Emergency Alerts | Alert creation + admin real-time delivery | Implemented | Alerts service supports admin channels and SSE publishing |
| Student Presence | Presence service and event processing | Implemented | Presence service supports manual and SmartTag-style flows |
| Video Capture | Event creation + secure uploads | Implemented | MinIO/local storage supported |
| Route Management | CRUD + vehicle overlap checks | Implemented | In API gateway; optimization output is still mocked |
| Fleet Management | Vehicle CRUD | Implemented | In API gateway with per-school uniqueness |
| Student Management | Enrollment + bulk import | Implemented | Proxied through API gateway |
| Compliance | Inspections + audit logs | Implemented | Proxied through API gateway |
| Admin Dashboard | Monitoring UI | Implemented | Uses gateway APIs with token persistence and basic board or school views |
| Driver App | Route selection + GPS + panic | Partial | Offline buffering exists; presence flow and BLE capture remain incomplete |
| Parent Portal | Child list + live map | Partial | Live tracking exists, but notification delivery and absence flows are incomplete |
| Notifications | Parent push/SMS/email | Planned | End-to-end delivery pipeline is not yet wired |
| Geofencing | Route deviation alerts | Planned | GPS intelligence and event publication are not yet implemented |
