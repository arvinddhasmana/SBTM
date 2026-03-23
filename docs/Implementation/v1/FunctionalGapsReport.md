# Functional Gaps & Pending Implementations Report (v1)

## Executive Summary
This report outlines the major functional gaps and pending implementations in the School Bus Transport Management System (SBMS) as of the current implementation phase. Based on the requirements (Features matrix, Gap Analysis, and source code review), several mock implementations, planned features, and structural gaps need to be addressed to achieve full production readiness.

## 1. Core Application Workflows

### 1.1 Driver App
- **Offline Resilience**: Essential offline buffering for GPS locations (`// TODO: Implement offline buffering here`) and queueing for emergency alerts (`// TODO: Queue for retry if offline`) are not yet fully implemented.
- **Presence & BLE**: Driver app presence events and BLE SmartTag integrations are not fully wired to the central presence service, preventing seamless passenger boarding/alighting capabilities.
- **Status Updates**: Missing integration for API calls to update the driver's active status dynamically based on route progress.

### 1.2 Parent Portal
- **Notifications**: General notification capabilities (Push/SMS/Email) are currently planned but not wired into the application. Critical alerts, delays, and student absence workflows are missing.

### 1.3 Admin Dashboard
- **Route Optimization**: The route planning and optimization visualization relies on mocked logic. Real-time pathing and map polyline drawing (`// Mocking polyline visualization`) need integration with actual map providers (e.g., Google Maps, Mapbox).
- **Organization Management**: The dashboard lacks comprehensive organization, board, and school management interfaces needed for distinct administrative views (OSTA, Board, and School levels).

## 2. Platform & Backend Services

### 2.1 Map & Geolocation Intelligence
- **Geofencing**: Route deviation alerts based on geofencing and spatial analysis are planned but not implemented. Actual path adherence logic is missing from the GPS tracking workflow.

### 2.2 Security & Multi-Tenancy Architecture
- **Tenant Enforcement**: While the API gateway enforces `schoolId` multi-tenancy correctly, there is no Row-Level Security (RLS) or strict database-level tenant enforcement in downstream services.
- **Service-to-Service Authentication**: Missing a robust S2S authentication model between internal microservices.
- **Audit Logging**: There is an absence of centralized audit logging outside of the specific Compliance management service.
- **Data Lifecycle**: Data retention, archiving, and deletion workflows to comply with regional privacy policies are not yet configured.

## 3. General Architecture Gaps
- **Testing & Mocks**: Several UI components and API layers in the Admin and Parent apps currently rely heavily on `vitest` mocks for data retrieval (Route data, live locations, alerts). Complete backend integration for all edge-case flows is pending.
