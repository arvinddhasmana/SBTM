# SBTM Feature Matrix

## Feature Status

| Area | Feature | Status | Notes |
| --- | --- | --- | --- |
| Identity | JWT auth + RBAC | Implemented | In API gateway; includes OSTA/Board/School roles |
| Multi-tenancy | School boards and schools | Partial | API gateway supports boards/schools; other services are not tenant-aware |
| GPS Tracking | Location ingest + live/history | Implemented | GPS service with Prisma and REST APIs |
| Emergency Alerts | Alert creation + WebSocket | Implemented | Alerts service sends admin notifications |
| Student Presence | BLE/manual events + WebSocket | Implemented | Presence service with Redis cache |
| Video Capture | Event creation + secure uploads | Implemented | MinIO/local storage supported |
| Route Management | CRUD + vehicle overlap checks | Implemented | In API gateway; optimization is mocked |
| Fleet Management | Vehicle CRUD | Implemented | In API gateway with per-school uniqueness |
| Student Management | Enrollment + bulk import | Implemented | Dedicated service |
| Compliance | Inspections + audit logs | Implemented | Dedicated service |
| Admin Dashboard | Monitoring UI | Implemented (demo) | Mock fallback when APIs not reachable |
| Driver App | Route selection + GPS + panic | Implemented (demo) | Mock auth, API base URL needs configuration |
| Parent Portal | Child list + live map | Implemented (demo) | Mock login and simulated SSE |
| Notifications | Parent push/SMS/email | Planned | Not wired in current code |
| Geofencing | Route deviation alerts | Planned | Not implemented |
