# Plan: SBTM Admin & Parent Portal Overhaul

Fix 6 problem areas across 6 phases. All UIs get modern dark glassmorphic treatment. Admin becomes a Command Center; Parent becomes a Card UI with bottom-sheet map.

Decisions confirmed: OSRM runtime snapping, Command Center admin, Card UI parent, glassmorphic design system.

## Phase 1: Fix Alerts Pipeline (Backend + Frontend)

Root cause: Dashboard calls GET /api/v1/alerts and PATCH /api/v1/alerts/:id/resolve - neither exists in backend. Both 404 -> "No Alerts."

1. Add findAll(schoolId?) to AlertsService - query all alerts without status filter (parallel with 2)
2. Add resolve(id) to AlertsService - set status RESOLVED
3. Add GET /alerts and PATCH /alerts/:id/resolve to emergency-alerts controller (depends on 1,2)
4. Add proxy routes in API Gateway controller (depends on 3)
5. Update frontend Alert type - add lat, lng, driverId, schoolId

Relevant files: alerts.service.ts, alerts.controller.ts, gateway alerts.controller.ts, types/index.ts, alerts.api.ts

## Phase 2: Road-Aligned GPS via OSRM (Option B - Runtime Snap)

Root cause: Linear interpolation between waypoints cuts across buildings. No road-snapping.

1. Add osrm service to docker-compose.yml - osrm/osrm-backend with Ottawa/Ontario PBF extract, port 5000
2. Create OsrmService in GPS tracking - calls GET http://osrm:5000/match/v1/driving/{coords}?geometries=geojson&radiuses=50
3. Add snappedLat, snappedLng columns to LocationPoint in Prisma schema
4. Integrate into LocationService.ingestLocation() - snap on ingest, store both raw + snapped coords
5. Update getLatestLocation() and getRouteHistory() - return snapped coords when available
6. Densify demo-gps-track.json waypoints using OSRM route API (50m sampling, ~50-100 points/route)
7. Adjust simulate-demo.sh for denser waypoint lists

Relevant files: docker-compose.yml, schema.prisma, services/gps-tracking/src/services/osrmService.ts (new), locationService.ts, demo-gps-track.json, simulate-demo.sh

## Phase 3: Route Planner Enhancements

1. Create RouteDetail.tsx at /routes/:id - info panel, stop list, assigned students, map with polyline + markers (parallel with 2)
2. Create RouteEdit.tsx at /routes/:id/edit - pre-filled form, updateRoute() API. Share form components with planner
3. Add View/Edit/Delete buttons to RouteCard.tsx with glassmorphic delete confirmation modal (parallel with 1)
4. Map click-to-add-stop: useMapEvents in planner - click -> Nominatim reverse-geocode -> auto-fill address + lat/lng
5. Polyline drawing: Click points to trace route path, real-time preview, double-click finishes
6. Draggable stop markers: Marker with draggable=true, update coords on dragend
7. Fix map center: Toronto -> Ottawa [45.3920, -75.7130]
8. Replace hardcoded schoolId: 's1' with dynamic value from user context
9. Add routes to App.tsx router: /routes/:id, /routes/:id/edit

Relevant files: RoutePlanner.tsx, RouteDetail.tsx (new), RouteEdit.tsx (new), RouteCard.tsx, App.tsx

## Phase 4: Student Presence Dashboard

1. Backend: GET /api/v1/presence/stats?schoolId= -> { totalTracked, boarded, alighted, unknown, byRoute[] } (parallel with 2)
2. Backend: GET /api/v1/presence/events?studentName=&schoolId=&routeId=&vehicleId=&eventType=&page=&limit= -> paginated events with student/school/bus/route info
3. Gateway proxy for both (depends on 1,2)
4. Stats Panel: Glassmorphic stat cards (Total, Boarded, Alighted, Unknown) + Recharts donut chart by route
5. Detail Table: Glass-card table - Student Name, School, Status badge ("On Bus ✓" green / "Dropped Off" blue), Timestamp, Bus, Route. Paginated
6. Filters Bar: Glass filter row - student name search, school dropdown, bus dropdown, route dropdown, event type toggle
7. Wire PresenceWebSocket for real-time updates (class exists but is never connected)
8. Replace raw "BOARDED"/"ALIGHTED" enum with friendly styled badges

Relevant files: presence.controller.ts, presence.service.ts, Students.tsx, presence.api.ts, PresenceStats.tsx (new), PresenceTable.tsx (new), PresenceFilters.tsx (new)

## Phase 5: Resizable/Collapsible UI + Map Fullscreen

1. Collapsible Sidebar: Chevron toggle, w-16 (icons only) <-> w-64 (full), transition-all duration-300, localStorage persistence. Dynamic ml- offset on main
2. Map Fullscreen: Floating glassmorphic expand button (Maximize2/Minimize2) on all maps. Fullscreen = fixed inset-0 z-50 with backdrop. ESC to exit
3. Resizable Panels: Install react-resizable-panels. Wrap map|list splits on Routes, Students, Dashboard in PanelGroup with PanelResizeHandle
4. Flexible map heights: h-[400px]/h-[500px] -> flex-1 min-h-[300px]

Relevant files: Sidebar.tsx, App.tsx, LiveMap.tsx, all pages with maps

New dependency: react-resizable-panels

## Phase 6: Glassmorphic UI Overhaul

### 6A: Admin Dashboard - Command Center

The admin already has a dark glassmorphic foundation (.glass-card, backdrop-blur-xl, slate palette in index.css). Build on top of it:

Layout:

- Collapsible Sidebar (w-16 collapsed / w-64 expanded)
- Full-width map hero (70vh)
- Floating glass overlays on map (bus list left, route detail drawer right)
- Alert ticker bar along map bottom
- Stat cards + charts section below map
┌───────────────────────────────────────────────────────┐
│ [≡] Sidebar (w-16 collapsed / w-64 expanded)          │
├───────────────────────────────────────────────────────┤
│                                                       │
│         FULL-WIDTH MAP (70vh hero)                     │
│                                                       │
│  ┌──────────┐                      ┌────────────────┐ │
│  │ Bus List  │    (map surface)    │ Route Detail   │ │
│  │ Glass     │                     │ Side Drawer    │ │
│  │ Panel     │                     │ (slides right) │ │
│  │ (left)    │                     │                │ │
│  └──────────┘                      └────────────────┘ │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 🔴 ALERT TICKER — scrolling live alerts           │ │
│ └───────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────┤
│  [Active Routes] [Buses Running] [Students] [Alerts]  │
│  ┌─────────────────────┐ ┌─────────────────────────┐  │
│  │ Presence Donut       │ │ Alert History           │  │
│  └─────────────────────┘ └─────────────────────────┘  │
└───────────────────────────────────────────────────────┘
New CSS utilities in index.css:

- .glass-panel - bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl
- .glass-pill - bg-white/10 backdrop-blur-md border border-white/5 rounded-full
- .glass-input - bg-white/5 backdrop-blur-md border border-white/10 rounded-xl
- .gradient-border - gradient wrapper for highlighted cards
- .alert-ticker - bg-red-950/80 backdrop-blur-xl border-t border-red-500/30
- Animations: slide-in-right (drawer), ticker (scrolling alerts), count-up (stats)

Dashboard.tsx redesign: 70vh map hero, floating glass bus list (left), route detail drawer (right, slides on click via framer-motion), alert ticker bar (bottom), stat cards + charts below map

Sidebar redesign: Collapsed -> icon + tooltip on hover. Active: gradient left border + bg-primary-500/10

### 6B: Parent Portal - Glassmorphic Card UI

Current state: plain white bg-gray-100 with no custom theme. Full redesign:

Theme: Dark glassmorphic matching admin. tailwind.config.js gets same dashboard + primary tokens. index.css gets glass utilities, dark body, Inter font, custom scrollbars.

Dashboard:

- Glass top nav (sticky)
- Alert banner (glass + pulsing)
- Child cards (glass) with ETA progress bars, route/bus details, status badge, Track Live CTA
┌──────────────────────────────────┐
│ TOP NAV (glassmorphic, sticky)   │
│ [🚌 Parent Portal] [🔔] [👤]    │
├──────────────────────────────────┤
│ ⚠️ ALERT BANNER (glass, pulsing) │
│                                  │
│ ┌────────────────────────────┐   │
│ │  👦 Child Card (glass)     │   │
│ │  Name • School • Route     │   │
│ │  ┌──────────────────────┐  │   │
│ │  │ ETA: 3 min  ████░ 85%│  │   │
│ │  └──────────────────────┘  │   │
│ │  Status: 🟢 On Bus         │   │
│ │  [📍 Track Live]           │   │
│ └────────────────────────────┘   │
└──────────────────────────────────┘
Map page:

- Full-screen map
- Route polyline + stop markers + animated bus marker
- Glass top bar
- Draggable bottom sheet with live ETA, next stop, and journey timeline
┌──────────────────────────────────┐
│  [← Back]  Child: Alex Johnson  │  ← glass top bar
├──────────────────────────────────┤
│     FULL-SCREEN MAP              │
│     - Route polyline (blue)      │
│     - Stop markers (glass dots)  │
│     - Animated bus marker        │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │  ← draggable bottom sheet
│  │  🟢 Live • ETA: 3 min      │  │
│  │  Next stop: Bank & Heron   │  │
│  │  Timeline:                  │  │
│  │  ⬤ 8:01 Departed Stop 1    │  │
│  │  ⬤ 8:05 Passed Stop 2      │  │
│  │  ○ 8:08 Next: Stop 3 (you) │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
Specific file changes:

- tailwind.config.js - add dashboard + primary color tokens
- src/index.css - glass utilities, dark body, Inter font
- Layout.tsx - dark glass nav, gradient logo, glass-pill nav items
- Dashboard.tsx - glass child cards, ETA progress bar, gradient status badges
- Map.tsx - route polyline, stop markers, glass bottom sheet (draggable via framer-motion)
- Login.tsx - dark gradient background, centered glass card
- Notifications.tsx - glass cards with status-colored left border
- AbsenceReport.tsx - glass form card

New dependency: framer-motion (drawer slide-in, bottom sheet drag, card transitions)

## Verification

1. Phase 1: simulate-demo.sh --interval 5 --laps 1 -> alerts page loads, All/Active/Resolved filter works, resolve button transitions status
2. Phase 2: Restart stack with OSRM, run simulation -> buses follow Ottawa streets (not cutting through buildings)
3. Phase 3: Create route via map clicks -> stops auto-geocoded, drag to adjust, save persists. Edit existing route. Delete with confirm
4. Phase 4: Run simulation -> stats panel shows live counts, donut chart updates, table rows populate, filters narrow results, WebSocket pushes appear without refresh
5. Phase 5: Toggle sidebar collapse, resize map fullscreen (ESC exits), drag panel handles, verify layout at different viewports
6. Phase 6: Visual QA - all glass styling, dark backgrounds, animations smooth (60fps), parent portal mobile-responsive

## Scope

Included: All 6 phases - alerts fix, OSRM integration, route planner CRUD+map, presence dashboard, resize/collapse, full glassmorphic redesign of both portals

Excluded: Parent mobile app (placeholder), actual push/SMS delivery (stub logs only), driver app UI, video service UI
