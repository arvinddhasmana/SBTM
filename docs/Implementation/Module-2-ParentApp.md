# Module 2 - Parent App (Web)

## Status
Implemented with live gateway integration.

## Source of Truth
- Current implementation: this document
- Upgrade gaps: `docs/prd/v1/UpgradePlan/GapAnalysis.md`
- Planned delivery phase: `docs/prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md` Phase 1

## Location
- `apps/parent-app/web`

## Tech Stack
- React 19 + Vite
- TailwindCSS
- React Router + Leaflet

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
- `apps/parent-app/mobile` contains a Flutter scaffold only.
