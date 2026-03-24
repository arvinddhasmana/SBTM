# SBTM User Journey (Current Implementation)

- Document owner: Product and UX
- Last reviewed: 2026-03-24
- Primary use: Business-facing walkthrough of the currently deliverable user experience

This document describes the currently deliverable user flow at a business level. For upgrade gaps and phase sequencing, use `docs/prd/v1/UpgradePlan/GapAnalysis.md` and `docs/prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md`.

## Related Documents

- [Requirements.md](Requirements.md)
- [UseCases.md](UseCases.md)
- [Features.md](Features.md)
- [GapAnalysis.md](../prd/v1/UpgradePlan/GapAnalysis.md)
- [LiveDemoScript.md](../Demo/LiveDemoScript.md)

## Admin Journey (Web)
1. Open Admin Dashboard (Vite app).
2. Login via API gateway and persist token in local storage.
3. View dashboard tiles, map, and alerts from live gateway data.
4. Review routes, students, presence, compliance, and videos.
5. Access basic board and school listing views.

**Notes:** Full board and school onboarding, invitations, and lifecycle management are still pending.

## Driver Journey (Mobile)
1. Open Driver App (Expo).
2. Login via API gateway and receive a JWT.
3. View schedule via `/api/v1/driver/me/schedule`.
4. GPS updates are sent to `/api/v1/routes/locations`.
5. Trigger panic button to send emergency events.
6. Use the roster while presence integration is still partially local in the current UI.

**Notes:** API base URL is configured via `EXPO_PUBLIC_API_URL`. The mobile app already includes offline buffering, but authoritative presence capture and BLE scanning are still upgrade work.

## Parent Journey (Web)
1. Open Parent Portal (Vite app).
2. Login via API gateway and persist token in local storage.
3. View children cards from `/api/v1/parent/children`.
4. Open live map; app polls `/api/v1/routes/:routeId/live-location`.

**Notes:** The current experience is polling-based. Real notification delivery, notification history, and absence reporting are still pending.
