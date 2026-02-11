# SBTM Architecture (Current Implementation)

## Overview
The system is a monorepo with frontend apps and backend microservices. An API gateway provides authentication, RBAC, and proxy routing. Core services are focused on GPS tracking, emergency alerts, student presence, and video capture. Student and compliance management services exist but are not yet routed through the API gateway.

## Current Architecture
```mermaid
graph TD
  Admin[Admin Dashboard (Vite)] --> Gateway[API Gateway]
  Parent[Parent Portal (Vite)] --> Gateway
  Driver[Driver App (Expo)] --> Gateway

  Gateway --> GPS[GPS Tracking Service]
  Gateway --> Alerts[Emergency Alerts Service]
  Gateway --> Presence[Student Presence Service]
  Gateway --> Video[Video Service]

  Gateway --> Org[Org/Route/Fleet Modules (Gateway DB)]
  StudentMgmt[Student Management Service] -.-> Postgres
  Compliance[Compliance Management Service] -.-> Postgres

  GPS --> Postgres[(PostgreSQL)]
  Alerts --> Postgres
  Presence --> Postgres
  Video --> Postgres
  Presence --> Redis[(Redis)]
  Alerts --> Redis
```

## Multi-Tenant Readiness (Partial)
- API gateway includes School Board, School, Route, and Vehicle entities.
- Multi-tenant guards enforce `boardId` and `schoolId` on gateway endpoints.
- Downstream services (GPS, Alerts, Presence, Video) are not tenant-aware yet.

## Target Architecture (Multi-Tenant V2)
- All primary entities include `school_id` and enforce isolation in every service.
- Admin dashboards support OSTA, board, and school views.
- Route optimization and geofencing integrate with map providers.

## Gap Summary
See [docs/Implementation/GapAnalysis.md](../Implementation/GapAnalysis.md) for detailed deltas.
