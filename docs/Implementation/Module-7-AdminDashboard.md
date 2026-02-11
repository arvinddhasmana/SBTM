# Module 7 - Admin Dashboard

## Status
Implemented with live gateway integration.

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
