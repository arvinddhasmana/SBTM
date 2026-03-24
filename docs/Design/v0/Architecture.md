# SBTM Architecture (Current Implementation)

## Overview
The system is a monorepo with frontend apps and backend microservices. An API gateway provides authentication, RBAC, multi-tenant guards, and proxy routing. Core services cover GPS tracking, emergency alerts, student presence, video capture, student management, and compliance management.

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
  Gateway --> StudentMgmt[Student Management Service]
  Gateway --> Compliance[Compliance Management Service]

  Gateway --> Org[Org/Route/Fleet Modules (Gateway DB)]

  GPS --> Postgres[(PostgreSQL)]
  Alerts --> Postgres
  Presence --> Postgres
  Video --> Postgres
  StudentMgmt --> Postgres
  Compliance --> Postgres
  Presence --> Redis[(Redis)]
  Alerts --> Redis
```

## Multi-Tenant Readiness
- API gateway includes School Board, School, Route, and Vehicle entities.
- Multi-tenant guards enforce `boardId` and `schoolId` on gateway endpoints.
- Downstream services store `school_id` and filter queries by tenant scope.

## Remaining Targets
- Admin dashboards support OSTA, board, and school views.
- Route optimization and geofencing integrate with map providers.
- Service-to-service authentication and centralized audit pipelines.

## Gap Summary
See [docs/Implementation/GapAnalysis.md](../Implementation/GapAnalysis.md) for detailed deltas.
