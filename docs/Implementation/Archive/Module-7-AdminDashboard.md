# Module 7 - Admin Dashboard

> **⚠ Historical — v1 Era.** This module document reflects the v1 admin dashboard. For the current v2 route planner and alert management design see [RoutePlanner.md](../Design/RoutePlanner.md) and [Alerts.md](../Design/Alerts.md).

- Last reviewed: 2026-03-30

## Status

Implemented with live gateway integration.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 3 and 4

## Location

- `apps/admin-dashboard`

## Runtime

- **Port**: 5173 (dev Vite), 80 (production Nginx)
- **docker-compose**: Maps 5173→80

## Tech Stack

- React 19.0.0 + Vite 6.3.1
- TailwindCSS 3.4.17
- Leaflet 1.9.4 + React Leaflet 5.0.0 (maps)
- Recharts 2.15.3 (charts)
- Axios 1.13.2 (HTTP client)
- Socket.IO Client 4.8.3 (real-time alerts and presence updates)
- Lucide React (icons)
- Testing: Vitest 4.1.1 + React Testing Library 16.3.0

## Functionality

- Login screen and auth context
- Dashboard, alerts, routes, students, videos pages
- Gateway-backed data with token persistence

## Integration Notes

- Uses `VITE_API_URL` and calls `/api/v1/*` endpoints.
- Presence views aggregate by route using gateway presence data.

## Gaps / Next Steps

- Multi-tenant admin views (board/school scopes)
- Organization management UI
- Route optimization is still backed by placeholder provider output.
