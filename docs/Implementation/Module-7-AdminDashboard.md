# Module 7 - Admin Dashboard

## Status
Implemented as a demo-first web UI with mock fallback.

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
- Mock data fallback when API is unreachable

## Integration Notes
- Uses `VITE_API_URL` and calls `/auth/login` and `/api/v1/*` endpoints.
- Some endpoints referenced by the UI do not exist in the API gateway yet.

## Gaps / Next Steps
- Align UI endpoints with gateway routes
- Real data for routes, videos, and presence
- Multi-tenant admin views (board/school scopes)
