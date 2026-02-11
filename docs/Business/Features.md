# SBTM Feature Matrix

## Feature Status

| Area | Feature | Status | Notes |
| --- | --- | --- | --- |
| Identity | JWT auth + RBAC | Implemented | In API gateway; includes OSTA/Board/School roles |
| Multi-tenancy | School boards and schools | Implemented | Gateway enforces board/school scopes; services filter by `school_id` |
| GPS Tracking | Location ingest + live/history | Implemented | GPS service with Prisma and REST APIs |
| Emergency Alerts | Alert creation + WebSocket | Implemented | Alerts service sends admin notifications |
| Student Presence | BLE/manual events + WebSocket | Implemented | Presence service with Redis cache |
| Video Capture | Event creation + secure uploads | Implemented | MinIO/local storage supported |
| Route Management | CRUD + vehicle overlap checks | Implemented | In API gateway; optimization is mocked |
| Fleet Management | Vehicle CRUD | Implemented | In API gateway with per-school uniqueness |
| Student Management | Enrollment + bulk import | Implemented | Proxied through API gateway |
| Compliance | Inspections + audit logs | Implemented | Proxied through API gateway |
| Admin Dashboard | Monitoring UI | Implemented | Uses gateway APIs with token persistence |
| Driver App | Route selection + GPS + panic | Implemented | Gateway auth + schedule; presence integration pending |
| Parent Portal | Child list + live map | Implemented | Gateway auth + live location polling |
| Notifications | Parent push/SMS/email | Planned | Not wired in current code |
| Geofencing | Route deviation alerts | Planned | Not implemented |
