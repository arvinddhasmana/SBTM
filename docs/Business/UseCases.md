# SBTM Use Cases (Current vs Target)

- Document owner: Product and Delivery
- Last reviewed: 2026-03-24
- Primary use: Business workflow comparison between target behavior and current delivery

This document summarizes business workflows and should be read with `docs/prd/v1/UpgradePlan/GapAnalysis.md` when implementation status matters.

## Related Documents

- [Requirements.md](Requirements.md)
- [Features.md](Features.md)
- [UserJourney.md](UserJourney.md)
- [GapAnalysis.md](../prd/v1/UpgradePlan/GapAnalysis.md)
- [PhaseWiseImplementationPlan.md](../prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)

## 1. School Onboarding and Organization Management
**Target:** OSTA admins create boards and schools, invite school admins.

**Current status:** Partial. API gateway exposes `/boards` and `/schools` endpoints with RBAC, and the admin dashboard includes basic board and school listing views. Full onboarding, editing, invitation, and lifecycle workflows are not yet complete.

## 2. Route Planning and Optimization
**Target:** Admins create AM/PM routes, manage stops, and run AI optimization.

**Current status:** Partial. Route CRUD and stop storage exist in the API gateway, and route-planning views exist in the admin dashboard. Optimization is mocked and returns placeholder geometry rather than provider-backed routes.

## 3. OSTA System-Wide Monitoring
**Target:** Global dashboard for fleet health, alerts, and performance across boards.

**Current status:** Partial. Admin dashboard consumes live gateway data and supports operational monitoring. Board-level aggregation and richer OSTA-wide rollups are still limited.

## 4. Driver Daily Operations
**Target:** Driver logs in, selects route, starts GPS, records presence, and triggers emergencies.

**Current status:** Partial. Driver app uses gateway auth, fetches schedule, sends GPS updates, supports offline buffering, and triggers emergencies. Presence API support exists, but the main roster flow is still not the authoritative backend-backed workflow and BLE capture is not complete.

## 5. Parent Tracking and Notifications
**Target:** Parents track their children, receive notifications, and report absences.

**Current status:** Partial. Parent web app uses gateway auth and live location polling. Alerts SSE exists in the backend, but the parent app still relies on polling and does not yet provide real notification delivery, inbox history, or absence reporting.

## 6. Student Presence Detection
**Target:** BLE/RFID detection with manual override and real-time updates.

**Current status:** Partial. The Student Presence service supports BLE or SmartTag-style and manual flows, but the driver app still needs authoritative presence integration and mobile BLE capture to complete the end-to-end workflow.

## 7. Video Event Review
**Target:** Admin review of video events from emergencies and incidents.

**Current status:** Video service is implemented and proxied via the gateway. Admin UI lists events; real playback wiring is pending.
