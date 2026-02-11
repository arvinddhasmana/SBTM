# SBTM User Journey (Current Implementation)

## Admin Journey (Web)
1. Open Admin Dashboard (Vite app).
2. Login via API gateway and persist token in local storage.
3. View dashboard tiles, map, and alerts from live gateway data.
4. Review routes, students, presence, compliance, and videos.

**Notes:** Board/school management views are still pending.

## Driver Journey (Mobile)
1. Open Driver App (Expo).
2. Login via API gateway and receive a JWT.
3. View schedule via `/api/v1/driver/me/schedule`.
4. GPS updates are sent to `/api/v1/routes/locations`.
5. Trigger panic button to send emergency events.
6. Mark student presence locally in the roster (presence API wiring is pending).

**Notes:** API base URL is configured via `EXPO_PUBLIC_API_URL`.

## Parent Journey (Web)
1. Open Parent Portal (Vite app).
2. Login via API gateway and persist token in local storage.
3. View children cards from `/api/v1/parent/children`.
4. Open live map; app polls `/api/v1/routes/:routeId/live-location`.

**Notes:** Notifications are not wired yet.
