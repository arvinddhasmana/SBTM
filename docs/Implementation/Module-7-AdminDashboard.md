# Module 7 - Admin Dashboard

## Status
Implemented with live gateway integration.

## Source of Truth
- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 3 and 4

## Location
- `apps/admin-dashboard`

## Tech Stack
- React 19 + Vite
- TailwindCSS
- Leaflet + Recharts
- Axios

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
