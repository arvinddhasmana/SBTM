# SBTM System Design (Consolidated)

## API Surface (Current)
### API Gateway
- Auth: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- Boards: `GET /api/v1/boards`, `GET /api/v1/boards/:id`, `POST /api/v1/boards`
- Schools: `GET /api/v1/schools`, `GET /api/v1/schools/:id`, `POST /api/v1/schools`
- Vehicles: `GET /api/v1/vehicles`, `POST /api/v1/vehicles`, `PATCH /api/v1/vehicles/:id`
- Routes: `GET /api/v1/routes`, `POST /api/v1/routes`, `PATCH /api/v1/routes/:id`, `POST /api/v1/routes/optimize`
- GPS proxy: `GET /api/v1/routes/:routeId/live-location`, `GET /api/v1/routes/:routeId/history`
- Alerts proxy: `GET /api/v1/alerts/active`, `GET /api/v1/alerts/:id`, `POST /api/v1/emergency-events`
- Presence proxy: `GET /api/v1/routes/:routeId/students`, `POST /api/v1/student-presence-events`
- Video proxy: `GET /api/v1/video-events`, `GET /api/v1/video-events/:id`, `POST /api/v1/video-events`

### GPS Tracking Service
- `POST /api/v1/locations`
- `GET /api/v1/routes/:routeId/live-location`
- `GET /api/v1/routes/:routeId/history`

### Emergency Alerts Service
- `POST /api/v1/emergency-events`
- `GET /api/v1/alerts/active`
- `GET /api/v1/alerts/:alertId`
- `GET /api/v1/alerts/parent-view/:routeId`

### Student Presence Service
- `POST /api/v1/presence-events`
- `POST /api/v1/student-presence-events/manual`
- `GET /api/v1/routes/:routeId/students`

### Video Service
- `POST /api/v1/video-events`
- `POST /api/v1/video-events/:id/complete`
- `POST /api/v1/video-events/:id/failed`
- `GET /api/v1/video-events`
- `GET /api/v1/video-events/:id`

### Student Management Service
- `GET /students`, `GET /students/:id`
- `POST /students`, `PATCH /students/:id`, `DELETE /students/:id`
- `PATCH /students/:id/assignment`
- `POST /students/bulk-import`

### Compliance Management Service
- `GET /compliance`, `GET /compliance/driver/:driverId`, `POST /compliance/driver/:driverId`
- `GET /inspections`, `GET /inspections/latest`, `POST /inspections`
- `GET /audit`, `GET /audit/resource`, `POST /audit`

## Data Model Summary (Current)
- API gateway tables: `school_boards`, `schools`, `users`, `routes`, `route_stops`, `vehicles`.
- GPS: `location_points`.
- Alerts: `emergency_alerts`, `alert_notification_logs`.
- Presence: `presence_events`, `student_tags`.
- Video: `video_events`, `video_access_logs`.
- Student management: `students`.
- Compliance management: `driver_compliance`, `vehicle_inspections`, `audit_logs`.

## UI Design Notes
- Admin Dashboard: Vite + React + Tailwind; mock data fallback.
- Parent Portal: Vite + React; mock auth and simulated SSE.
- Driver App: React Native (Expo); mock auth, demo GPS and panic.
