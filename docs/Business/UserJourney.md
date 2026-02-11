# SBTM User Journey (Current Implementation)

## Admin Journey (Web)
1. Open Admin Dashboard (Vite app).
2. Login (mock fallback if API gateway is unreachable).
3. View dashboard tiles, map, and alerts (mocked data by default).
4. Review routes, students, and videos (UI ready; API integration partial).

**Notes:** The admin UI is feature-complete for demo use but relies on mock data when backend endpoints are not available.

## Driver Journey (Mobile)
1. Open Driver App (Expo).
2. Login with demo credentials (mock auth).
3. Select a route and start tracking.
4. GPS updates are sent to the configured API base URL.
5. Trigger panic button to send emergency events.
6. Mark student presence locally in the roster (not wired to presence service).

**Notes:** API base URL is hardcoded in `apps/driver-app/src/services/api.service.ts` and must be updated for real backend usage.

## Parent Journey (Web)
1. Open Parent Portal (Vite app).
2. Login (mocked, any credentials accepted).
3. View children cards and route status.
4. Open live map; simulated SSE updates move the bus.

**Notes:** Parent portal uses mock data and does not call backend services in the current implementation.
