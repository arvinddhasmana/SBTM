# Phase-Wise Implementation Plan (v1)

This document outlines the structured approach to addressing the major functional gaps and pending implementations identified in the [Functional Gaps Report](./FunctionalGapsReport.md). 

## Phase 1: Core User Experience & Resilience

**Goal:** Ensure the absolute baseline functionality for the two primary actors—drivers and parents—is seamless, reliable, and integrated.

1. **Driver App Offline Resilience**
   - **Task:** Implement local SQLite or AsyncStorage offline buffering for GPS coordinates and emergency events.
   - **Verification:** Unit tests for queue insertion and extraction. Manual network throttling tests on mobile emulators.
2. **Parent App Notifications**
   - **Task:** Wire the currently planned notifications system structure into FCM / APNs (or SMS gateway like Twilio) and complete UI handlers for push alerts.
   - **Verification:** E2E notification delivery tests using mocked Push services.

## Phase 2: Sensor & Hardware Integration

**Goal:** Establish hardware-software handshakes for presence and path tracking.

1. **Driver App BLE & Presence Integration**
   - **Task:** Finalize the BLE SmartTag scanning integration on the Driver Expo app. Connect scanning events to the existing Student Presence Service WebSocket.
   - **Verification:** Device testing with physical BLE tags or simulated BLE broadcast signals.
2. **Location State Synchronization**
   - **Task:** Replace local `.test.ts` mock data loops with live driver status updates (Driver status API wiring).

## Phase 3: Administrative Map Intelligence

**Goal:** Modernize the visualization layer and administrative control.

1. **Map Provider Integration**
   - **Task:** Replace mock polyline visualization in the Admin Dashboard with a genuine map API (e.g., Google Maps API or Mapbox GL JS). Integrate route optimization and rendering.
   - **Verification:** Visual validation of rendered map bounds and route snapping.
2. **Geofencing & Analytics**
   - **Task:** Develop route deviation logic within the GPS Tracking Service using server-side spatial analysis tools (e.g., PostGIS or Redis geospatial features).

## Phase 4: Security, Multi-Tenancy & Data Lifecycle

**Goal:** Bring the system to full multi-tenant, enterprise compliance standards.

1. **Strict Multi-tenant Isolation**
   - **Task:** Evaluate and implement Row-Level Security (RLS) in PostgreSQL instances across downstream services to complement the existing API Gateway isolation.
2. **Administrative Organization Views**
   - **Task:** Implement board-level and sub-school level filtering within the Admin Dashboard to support regional transport authority (OSTA) personas.
3. **Internal Security & Audit Logging**
   - **Task:** Establish service-to-service authentication (e.g., MTLS or internal JWT-signing) and connect all critical mutations to a centralized audit pipeline.
