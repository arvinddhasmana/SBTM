# Module 2 - Parent App (Web)

- Last reviewed: 2026-03-30

## Status

Implemented with live gateway integration.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phase: `docs/prd/PhaseWiseImplementationPlan.md` Phase 1

## Location

- `apps/parent-dashboard/web`

## Runtime

- **Port**: 3000 (dev Vite), 80 (production Nginx)
- **docker-compose**: Maps 3000→80

## Tech Stack

- React 19.2.0 + Vite 7.2.4
- TailwindCSS 3.4.17
- React Router DOM 7.10.1 + Leaflet 1.9.4 + React Leaflet 5.0.0
- Axios 1.13.2 (HTTP client)
- Lucide React (icons)
- Testing: Vitest 4.0.15 + React Testing Library 16.3.0
- TypeScript 5.9.3

## Functionality

- Gateway login
- Child cards with status
- Live map with polling for route location

## Integration Notes

- Uses `VITE_API_URL` and calls `/api/v1/auth/login`, `/api/v1/parent/children`, and `/api/v1/routes/:routeId/live-location`.

## Gaps / Next Steps

- Live notifications from backend services
- SSE-based alert delivery and notification history
- Multi-child/multi-school data from student management

## Mobile App

- `apps/parent-dashboard/mobile` contains a Flutter scaffold only.
