# SBTM Use Cases (Current vs Target)

## 1. School Onboarding and Organization Management
**Target:** OSTA admins create boards and schools, invite school admins.

**Current status:** Partial. API gateway exposes `/boards` and `/schools` endpoints with RBAC, but there is no admin UI for onboarding and no invitation workflow.

## 2. Route Planning and Optimization
**Target:** Admins create AM/PM routes, manage stops, and run AI optimization.

**Current status:** Partial. Route CRUD and stop storage exist in the API gateway. Optimization is mocked and returns a placeholder polyline. No admin UI for route planning.

## 3. OSTA System-Wide Monitoring
**Target:** Global dashboard for fleet health, alerts, and performance across boards.

**Current status:** Partial. Admin dashboard consumes gateway data. Board-level aggregation and OSTA-wide views are not implemented.

## 4. Driver Daily Operations
**Target:** Driver logs in, selects route, starts GPS, records presence, and triggers emergencies.

**Current status:** Partial. Driver app uses gateway auth, fetches schedule, sends GPS updates, and triggers emergencies. Presence events are not wired yet.

## 5. Parent Tracking and Notifications
**Target:** Parents track their children, receive notifications, and report absences.

**Current status:** Partial. Parent web app uses gateway auth and live location polling. Notification workflows are not wired.

## 6. Student Presence Detection
**Target:** BLE/RFID detection with manual override and real-time updates.

**Current status:** Implemented in the Student Presence service (BLE/manual logic). Driver app manual roster is not integrated with presence APIs.

## 7. Video Event Review
**Target:** Admin review of video events from emergencies and incidents.

**Current status:** Video service is implemented and proxied via the gateway. Admin UI lists events; real playback wiring is pending.
