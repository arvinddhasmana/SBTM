# UI Design - Complete Reference

## Table of Contents

- [DashboardDesign](#dashboarddesign)
- [AdminDashboard](#admindashboard)
- [ParentPortal](#parentportal)
- [DriverApp](#driverapp)

---

## DashboardDesign

_Source: `docs/UiDesign/DashboardDesign.md`_

# Admin Dashboard: Tactical UI Design Specification

## Overview

The Admin Dashboard is the nerve center of the SBTM platform. It is designed as a **High-Density Tactical Command Center**, prioritizing situational awareness through a full-panel background map overlaid with interactive, glassmorphic data tiles.

### Visual Concept: "The Glass Cockpit"

The design follows the "Glass Cockpit" philosophy used in modern aviation and mission control. Information is layered, with the most critical data points floated as transparent patches over a persistent city-wide operation map.

![Tactical Dashboard Mockup](./AdminDashboard_mockui.png)

---

## Core UI Pillars

### 1. Persistent Map Layer (The Canvas)

- **Role**: Provides continuous visual context for fleet movements.
- **Styling**: Full-panel, dark-themed tactical map.
- **Behavior**: Acts as the bottom-most layer. Responds to panning and zooming while overlays remain fixed relative to the screen.

### 2. Floating Tactical Overlays (Dynamic Panels)

- **Components**: `Passenger Feed` (Top-Left), `Tactical Alerts` (Top-Right).
- **Glassmorphism**:
  - `backdrop-filter: blur(24px)`
  - `background: rgba(15, 23, 42, 0.2)`
- **Interactivity**:
  - **Draggable**: Can be repositioned anywhere on the screen.
  - **Resizable**: Handles on the bottom-right for manual scaling.
  - **Collapsible**: Minimizes to a small header to save space.
  - **Persistence**: Remembers their last set position and collapse state in the browser's local storage.
- **Orientation**:
  - The Left panel is anchored to the **Left Navigation Pane**, shifting automatically when the sidebar expands.
  - The Right panel is anchored to the **Right Edge**, ensuring stability across different browser zoom levels.

### 3. Fixed Tactical Bar (The Base)

- **Components**: `Legend`, `Mission Health`, `Fleet Metrics`.
- **Layout**: A single horizontal row docked at the bottom of the viewport.
- **Design**: Minimalist, header-less containers to maximize map real estate while ensuring "System Vital" stats (Buses on road, active alerts) are never covered.

---

## Design Tokens & Palette

### Colors (High Contrast)

- **Background**: Slate-950 (`#020617`) - Primarily used for the underlying map and dark overlays.
- **Primary Action**: Blue-400/500 - Used for icons and active selection.
- **Active Alerts**: Rose-500/Amber-500 - High-contrast emergency and incident indicators.
- **Safe/Synced**: Emerald-400/500 - Glowing status indicators for healthy system components.

### Typography

- **Primary Font**: `Inter` (Sans-serif).
- **Weights**:
  - `900 (Black)` for data values and headers.
  - `700 (Bold)` for labels.
- **Sizing**: Aggressively compact (`text-[9px]` to `text-[11px]`) to maintain high information density.

---

## Implementation Instructions for Team Members & AI Agents

### Modifying Overlays

When adding new data feeds as floating panels:

1. Wrap the content in the `FloatingPanel` component.
2. Provide a unique `id` for position persistence.
3. Use the `anchor="right"` prop for panels on the right side of the screen to ensure zoom stability.
4. Set default size and position carefully:
   - `x: 30, y: 80` is the standard offset from the header and corners.

### Styling New Components

Always use the predefined utility classes in `index.css`:

- `.glass-card`: For the main panel containers.
- `.glass-item`: For internal clickable cards (alerts, rows).
- `.custom-scrollbar`: To ensure minimal visual impact for scrollable feeds.

### Positioning Logic

- Use **`absolute`** positioning within the dashboard container. This ensures that panels move _with_ the layout (e.g., when the Sidebar expands) but stay _on top_ of the Map.
- **NEVER** use `fixed` for panels inside the main content area, as they will ignore the sidebar expansion and cover navigation icons.

---

## Mock Mode Architecture

The dashboard supports a **zero-backend** mock mode for rapid UI development. Mock data and logic are fully separated from production code.

### Data Layer Separation

```
src/services/mock/
├── data/       ← Pure data constants (no logic)
└── handlers/   ← Mock API implementations (import from data/)
```

The API barrel (`src/services/api/index.ts`) conditionally exports either real or mock implementations based on `VITE_USE_MOCK`:

```typescript
export const alertsApi = useMock ? mockAlertsApi : realAlertsApi;
```

### Adding Mock Data for New Features

1. Add data constants to `src/services/mock/data/<domain>.data.ts`
2. Create handler in `src/services/mock/handlers/<domain>.mock.ts`
3. Export from `src/services/mock/index.ts`
4. Add conditional export in `src/services/api/index.ts`

### Mock Mode Indicator

When active, the dashboard header shows an amber "Mock Data Active" badge. The Login page shows a "Mock Mode Active" pill with an exit button.

---

## AdminDashboard

_Source: `docs/UiDesign/AdminDashboard.md`_

# Admin Dashboard: Complete UI Design Specification

## Overview

The Admin Dashboard is a React single-page application (SPA) built with Vite, React Router v6, TanStack React Query, and Tailwind CSS. It serves as the primary management interface for the SBTM platform, providing real-time fleet monitoring, alert management, route planning, student administration, compliance tracking, and multi-tenant organization management.

The application enforces a hierarchical role-based access control (RBAC) model with four admin roles: `SUPER_ADMIN`, `OSTA_ADMIN`, `BOARD_ADMIN`, and `SCHOOL_ADMIN`. Each page is wrapped in route guards that restrict visibility based on the authenticated user's role.

### Visual Identity

The dashboard follows a **dark-mode tactical** aesthetic. All pages except the map-centric Dashboard use a standard sidebar + content layout with `DashboardLayout`. The main Dashboard page follows the "Glass Cockpit" philosophy described in `DashboardDesign.md` -- a full-panel background map overlaid with floating glassmorphic panels.

---

## Core UI Pillars

### 1. Dark Tactical Theme

- **Background**: Slate-950 (`#020617`) via `bg-dashboard-bg`
- **Cards**: Semi-transparent dark cards via `bg-dashboard-card` with `border-dashboard-border`
- **Text**: White primary, Slate-400 secondary, Slate-500 tertiary
- **Accent**: Blue-500 (`#3b82f6`) for primary actions, Emerald-500 for success, Rose-500 for danger, Amber-500 for warnings

### 2. Glassmorphism

- Floating panels use `glass-card` utility: `backdrop-filter: blur(24px)`, `background: rgba(15, 23, 42, 0.2)`
- Interactive sub-items use `glass-item` utility class
- Custom scrollbars via `custom-scrollbar` class for minimal visual impact

### 3. Information Density

- Aggressively compact typography: `text-[7.5px]` to `text-[11px]` for tactical overlays
- `font-black` (900 weight) for data values, `font-bold` (700) for labels
- `uppercase tracking-widest` for category labels

### 4. Component Library

- **Header**: Page title, subtitle, and optional action slot
- **Card**: Generic container with optional title, used across all non-dashboard pages
- **LoadingSpinner**: Centered spinner with optional text label
- **FloatingPanel**: Draggable, resizable, collapsible panel with local-storage position persistence
- **PanelSearch**: Compact search input designed for floating panels

---

## Design Tokens & Palette

### Colors

| Token              | Value                 | Usage                             |
| ------------------ | --------------------- | --------------------------------- |
| `dashboard-bg`     | Slate-950 `#020617`   | Page background                   |
| `dashboard-card`   | Semi-transparent dark | Card backgrounds                  |
| `dashboard-border` | White/10              | Card and table borders            |
| `primary-500`      | Blue-500 `#3b82f6`    | Primary actions, active nav items |
| `primary-400`      | Blue-400              | Icons, links                      |
| Rose-500           | `#f43f5e`             | Active/critical alerts            |
| Amber-500          | `#f59e0b`             | Warnings, operational alerts      |
| Emerald-500        | `#10b981`             | Success, healthy status           |
| Green-500          | `#22c55e`             | Normal bus status                 |
| Red-500            | `#ef4444`             | Danger, emergency, delete actions |

### Typography

- **Font**: `Inter` (sans-serif)
- **Weights**: 900 (Black) for values/headers, 700 (Bold) for labels, 600 (Semibold) for body emphasis, 500 (Medium) for nav items
- **Sizing**: `text-[6.5px]` to `text-3xl` depending on context (tactical overlays use smallest sizes)

---

## Navigation Structure

### Sidebar (`components/common/Sidebar.tsx`)

The sidebar is a fixed left-side panel with collapsible behavior. It persists across all protected pages via `DashboardLayout`.

**Properties:**

- Fixed positioning: `fixed left-0 top-0 h-screen`
- Collapsible with animated width transition (`transition-all duration-300 ease-in-out`)
- Logo section with Bus icon and "OSTA Admin" branding
- Collapse toggle button and logout button at the bottom

**Navigation Items (role-filtered):**

| Path                  | Icon              | Label       | Allowed Roles                        |
| --------------------- | ----------------- | ----------- | ------------------------------------ |
| `/dashboard`          | `LayoutDashboard` | Dashboard   | All admins                           |
| `/alerts`             | `Bell`            | Alerts      | All admins                           |
| `/alerts/operational` | `ClipboardList`   | Operational | All admins                           |
| `/routes`             | `Route`           | Routes      | All admins                           |
| `/routes/planner`     | `Wand2`           | Planner     | All admins                           |
| `/vehicles`           | `Bus`             | Fleet       | SUPER_ADMIN, OSTA_ADMIN              |
| `/compliance`         | `Shield`          | Compliance  | All admins                           |
| `/fleet-assignments`  | `Truck`           | Assignments | All admins                           |
| `/students`           | `Users`           | Students    | All admins                           |
| `/absences`           | `CalendarOff`     | Absences    | All admins                           |
| `/boards`             | `Building2`       | Boards      | SUPER_ADMIN, OSTA_ADMIN              |
| `/schools`            | `School`          | Schools     | SUPER_ADMIN, OSTA_ADMIN, BOARD_ADMIN |
| `/users`              | `UserCog`         | Users       | SUPER_ADMIN only                     |
| `/settings`           | `Settings`        | Settings    | All admins                           |

Active nav items use: `bg-blue-500/20 text-blue-400 border border-blue-500/30`
Inactive items use: `text-slate-400 hover:bg-slate-800 hover:text-white`

---

## Authentication & Route Protection

### Route Guards

```
App.tsx
  QueryClientProvider
    BrowserRouter
      AuthProvider
        AppRoutes
          PublicRoute (redirects to /dashboard if authenticated admin)
            /login -> Login
          ProtectedRoute (redirects to /login if not authenticated admin)
            DashboardLayout (Sidebar + Outlet)
              /dashboard -> Dashboard
              /alerts -> Alerts
              /alerts/operational -> OperationalAlerts
              /routes -> Routes
              /routes/planner -> RoutePlanner
              /students -> Students
              /videos -> Videos
              /settings -> Settings
              /compliance -> Compliance
              /absences -> AbsenceManagement
              /fleet-assignments -> FleetAssignments
              RoleGuard(SUPER_ADMIN, OSTA_ADMIN)
                /vehicles -> Vehicles
                /boards -> BoardsList
              RoleGuard(SUPER_ADMIN, OSTA_ADMIN, BOARD_ADMIN)
                /schools -> SchoolsList
                /tenant-overview -> TenantDashboard
              RoleGuard(SUPER_ADMIN)
                /users -> UserManagement
```

### Query Client Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

---

## Page Specifications

### 1. Login Page (`/login`)

**Route**: `/login` (public)
**Access**: Unauthenticated users only; authenticated admins are redirected to `/dashboard`

**Layout**: Centered card on dark background (`bg-dashboard-bg`), no sidebar.

**Components:**

- Logo: Bus icon in gradient container (`from-primary-500 to-primary-700 rounded-2xl`)
- Title: "OSTA Admin Dashboard"
- Mock mode indicator: Amber pill with pulsing dot and "(Exit)" button when `useMock` is true
- Form: Email input (with Mail icon), Password input (with Lock icon), Submit button
- Error display: Red alert box with `AlertCircle` icon
- Footer text: "School Bus Transport Management System"

**Styling:**

- Form container: `glass-card p-8`
- Input fields: `input-field pl-12` (custom class)
- Submit button: `btn-primary w-full py-3`
- Error: `bg-red-500/10 border border-red-500/30 rounded-xl text-red-400`

**Data Flow:**

- `useAuth().login(email, password)` authenticates
- UNAUTHORIZED_ROLE error shows "This portal is for administrators only."
- Success navigates to `/dashboard`

---

### 2. Dashboard (`/dashboard`) -- Tactical Command Center

**Route**: `/dashboard`
**Access**: All admin roles

**Layout**: Full-viewport map-centric view with no standard page padding. The map fills the entire screen as a background layer, with floating glassmorphic panels overlaid on top.

**Architecture:**

- Background layer: `LiveMap` component (absolute positioned, z-0)
- Overlay layer: Floating panels and tactical bar (absolute positioned, z-10, `pointer-events-none` container with `pointer-events-auto` on interactive elements)

**Mode Toggle (Info/Action):**

- Two-button toggle in the Header: "Info" (blue) and "Action" (amber)
- **Info mode**: Shows all non-terminal alerts (excludes RESOLVED, FALSE_ALARM), all active routes, all locations, all students
- **Action mode**: Shows only ACTIONABLE alerts (ACTIVE, PENDING_CONFIRMATION, AUTO_ESCALATED, CONFIRMED), filters routes/buses/students to only those associated with actionable alerts

**Floating Panels:**

| Panel           | Position      | Default Size | Anchor | Content                                              |
| --------------- | ------------- | ------------ | ------ | ---------------------------------------------------- |
| Routes          | Left, top     | 260x350px    | left   | Route search + RouteListCompact                      |
| Tactical Alerts | Right, top    | 280x400px    | right  | Tier filter dropdown + AlertList + "Review All" link |
| Passenger Feed  | Right, bottom | 280x300px    | right  | Passenger search + PresenceList + "Manifest" link    |

**Fixed Bottom Tactical Bar:**

- Legend panel (28px wide): Normal (green), Delayed (yellow), Emergency (red)
- Mission Health panel: GPS/HUB/TELEM status indicators with emerald glowing dots
- Fleet Metrics bar: Routes (blue), Buses (emerald), Boarded (indigo), Alerts (rose) with values
- Mode indicator pill in metrics bar

**Alert Detail Overlay:**

- Floating modal triggered by clicking an alert
- Shows full alert details with audit trail
- Action buttons: Resolve, Confirm, False Alarm, Request Info, Add Status Update
- Action availability gated by `canConfirm` (SCHOOL_ADMIN, BOARD_ADMIN, OSTA_ADMIN, ADMIN roles)

**Data Sources & Refresh:**

- Alerts: `alertsApi.getActiveAlerts()`, polled every 2 seconds
- Fleet data (locations + routes + students): Parallel fetch via `routesApi.getAllLiveLocations()`, `routesApi.getActiveRoutes()`, `presenceApi.getAllBoardedStudents()`, polled every 2 seconds
- Separated into two React Query queries to avoid alert actions invalidating fleet data

---

### 3. Alerts Management (`/alerts`)

**Route**: `/alerts`
**Access**: All admin roles

**Layout**: Standard layout with Header + padded content area

**Components:**

- Header: "Alerts Management" with dynamic subtitle showing counts
- Status filter bar (Card): All, Active (red), Pending (yellow, admin-only), In Progress (emerald), Resolved (green)
- Tier tabs: All Tiers (primary), Safety/Tier 1 (red), Operational/Tier 2 (amber), Informational/Tier 3 (blue)
- Alert list (Card): Full AlertList with route name enrichment
- Confirmation modal: `AlertConfirmationModal` for PENDING_CONFIRMATION alerts (admin-only)
- Detail modal: `AlertDetail` with resolve/confirm/false-alarm/request-info/status-update actions

**Data Sources:**

- `alertsApi.getAllAlerts()` via React Query (`queryKeys.alerts.all`)
- `routesApi.getAllRoutes()` for route name mapping (staleTime: 60s)
- Alert audit trail fetched on selection: `alertsApi.getAlertAuditLog(id)`

**User Interactions:**

- Click pending alert (admin) -> Confirmation modal
- Click other alerts -> Detail modal
- Filter by status and tier simultaneously
- Resolve with optional notes, confirm, mark false alarm, request info, add status update

---

### 4. Operational Alerts (`/alerts/operational`)

**Route**: `/alerts/operational`
**Access**: All admin roles

**Layout**: Standard layout

**Components:**

- Header: "Operational Alerts" with active Tier 2 count
- Event type filter bar: All, Late Arrival, Late Departure, Route Deviation, Route Diversion, Compliance, Other
- Alert list card with AlertDetail modal on click

**Data Sources:**

- Filters `alertsApi.getAllAlerts()` to `tier === 'TIER_2'` only
- Further filters by `eventType`

---

### 5. Route Monitoring (`/routes`)

**Route**: `/routes`
**Access**: All admin roles

**Layout**: Standard layout with 3-column grid (1 + 2)

**Components:**

- Left column (1/3): "All Routes" card with scrollable RouteList
- Right column (2/3): "Fleet Map" card with 500px-height LiveMap
- Route detail panel below map when a route is selected (name, direction, stop count, "Clear Selection" button)

**Data Sources:**

- `routesApi.getAllRoutes()` + `routesApi.getAllLiveLocations()` fetched in parallel
- Polled every 10 seconds
- Route polyline decoded via `decodePolyline()` utility

**Interactions:**

- Click route in list -> highlights on map, shows polyline if available
- Click marker on map -> selects corresponding route
- "Clear Selection" resets view

---

### 6. Route Planner (`/routes/planner`)

**Route**: `/routes/planner`
**Access**: All admin roles

**Layout**: Full-height split view (sidebar + map), no standard page padding

**Components:**

- Left pane: `RoutePlannerSidebar` (route list, filters, create/edit form with stop management)
- Right pane: `PlannerMap` (interactive map for placing/moving stops and adjusting paths)

**Key Hook**: `useRoutePlanner()` manages all planner state including:

- Route CRUD (create, edit, delete)
- Stop management (add, remove, reorder, move on map)
- Filters (search, direction, school)
- Auto-generation, optimization, snap-to-road
- Form validation with stop/spacing warnings

**Modes:**

- Browse: View and filter existing routes
- Create: New route form with map interaction
- Edit: Modify existing route

**School Admin Restriction**: `isSchoolAdmin` flag passed to sidebar limits certain operations

---

### 7. Students (`/students`)

**Route**: `/students`
**Access**: All admin roles

**Layout**: Standard layout with tab switcher

**Tabs:**

- **Live Presence**: Real-time student boarding/alighting monitoring
  - `PresenceStats`: Summary cards (total, boarded, alighted, unknown, by-route breakdown)
  - `PresenceFilters`: Name, route, event type filters
  - `PresenceTable`: Paginated event table with "Refreshing..." indicator
- **Administration**: Student enrollment and management
  - Action buttons: "Bulk Import" (Upload icon), "Enroll Student" (Plus icon)
  - `StudentTable`: Student roster with Edit, Delete, Assign Route actions
  - Modals: `BulkImportModal`, `RouteAssignmentModal`, `EnrollStudentModal`, `EditStudentModal`, `WithdrawStudentModal`

**Real-time Features:**

- WebSocket connection via `presenceWs.connect()` for live presence updates
- On WebSocket message: invalidates presence query cache
- React Query with standard refetch for management tab

**Data Sources:**

- Presence: `presenceApi.getStats()` + `presenceApi.getEvents()` (paginated)
- Management: `studentManagementApi.getStudents()`

---

### 8. Fleet Management (`/vehicles`)

**Route**: `/vehicles`
**Access**: SUPER_ADMIN, OSTA_ADMIN only (RoleGuard)

**Layout**: Standard layout with table card

**Components:**

- Header: "Fleet Management" with vehicle count and "Add Vehicle" button (Plus icon)
- Vehicle table: ID (with Bus icon), License Plate (monospace), Status badge, Actions (Edit/Delete, revealed on hover)
- Modal: Create/Edit vehicle form (License Plate input, Status dropdown: Active/Maintenance/Inactive)

**Status Badges:**

- ACTIVE: `bg-green-500/10 text-green-400`
- Non-active: `bg-yellow-500/10 text-yellow-400`

**Data Sources:**

- `fleetApi.getAllVehicles()` via React Query
- CRUD: `fleetApi.createVehicle()`, `fleetApi.updateVehicle()`, `fleetApi.deleteVehicle()`

---

### 9. Video Event Review (`/videos`)

**Route**: `/videos`
**Access**: All admin roles

**Layout**: Standard layout

**Components:**

- Header: "Video Event Review" with total count
- Filter card: Route dropdown, Event Type dropdown, "Clear Filters" link
- Video list card: `VideoList` component with click-to-play
- Player modal: `VideoPlayer` overlay

**Data Sources:**

- `videoApi.getVideoEvents()` + `routesApi.getAllRoutes()` fetched in parallel
- Filtered client-side by route and event type

---

### 10. Settings (`/settings`)

**Route**: `/settings`
**Access**: All admin roles

**Layout**: Standard layout with stacked cards

**Cards:**

- **Profile**: Avatar (gradient icon), user name, email, role badge
- **Notification Preferences**: Toggle switches for Emergency Alerts, Route Deviations, Daily Summary
  - Toggle component: Custom CSS checkbox with peer-checked styling
  - Emergency alerts default on, daily summary default off
- **Security**: Two-Factor Authentication row with "Enable" button
- **About**: "OSTA Admin Dashboard" version info

---

### 11. Compliance & Safety (`/compliance`)

**Route**: `/compliance`
**Access**: All admin roles

**Layout**: Standard layout with tab switcher

**Tabs:**

- **Drivers**: Summary stat cards (Compliant/green, Expiring Soon/yellow, Expired/red) + compliance table (Driver ID, License Expiry, Background Check, Medical Due, Status badge)
- **Inspections**: Table (Date, Vehicle, Driver, Type, Result pass/fail badge)
- **Audit**: System audit log table (Timestamp, User, Action, Resource, Details)

**Tab Switcher Styling:**

- Container: `bg-dashboard-card border border-dashboard-border rounded-xl`
- Active tab: `bg-primary-500 text-white shadow-lg shadow-primary-500/25`

**Data Sources:**

- `complianceApi.getAllCompliance()`, `complianceApi.getAllInspections()`, `complianceApi.getAuditLogs()` fetched in parallel with individual `.catch(() => [])` error handling

**Animations:**

- Drivers tab: `animate-in fade-in duration-500`
- Inspections/Audit tabs: `animate-in slide-in-from-bottom-2 duration-500`

---

### 12. User Management (`/users`)

**Route**: `/users`
**Access**: SUPER_ADMIN only (RoleGuard)

**Layout**: Standalone page (no Header component, uses own h1)

**Components:**

- Page title: "User Management" with "+ Invite User" button (blue-600)
- Invite form (expandable): Email input, Role dropdown (filtered by current user's role), School selector (conditional)
- User table: Email, Name, Role badge (`bg-blue-900/40 text-blue-300`), Status badge (Active green / Inactive gray), Actions (Deactivate/Reactivate)
- Success/error banners

**Role-based Invite Restrictions:**

- SCHOOL_ADMIN can invite: DRIVER, PARENT
- BOARD_ADMIN can invite: SCHOOL_ADMIN, DRIVER, PARENT
- OSTA_ADMIN can invite: BOARD_ADMIN, SCHOOL_ADMIN, DRIVER, PARENT
- SUPER_ADMIN can invite all roles

**Invitable Roles:** OSTA_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN, DRIVER, PARENT

**Data Sources:**

- `provisioningApi.listUsers()` + `organizationApi.listSchools()` (for school selector)

---

### 13. School Boards (`/boards`)

**Route**: `/boards`
**Access**: SUPER_ADMIN, OSTA_ADMIN only (RoleGuard)

**Layout**: Standalone page with table

**Components:**

- "School Boards" title with "+ Add Board" button (OSTA_ADMIN+ only)
- Create/Edit inline form with board name input
- Board table: Name, Schools count, Actions (Edit/Delete for OSTA_ADMIN+)

**Data Sources:**

- `organizationApi.listBoards()` with manual fetch (not React Query)
- CRUD: `organizationApi.createBoard()`, `organizationApi.updateBoard()`, `organizationApi.deleteBoard()`

---

### 14. Schools (`/schools`)

**Route**: `/schools`
**Access**: SUPER_ADMIN, OSTA_ADMIN, BOARD_ADMIN (RoleGuard)

**Layout**: Standalone page with table

**Components:**

- "Schools" title with "+ Add School" button (OSTA_ADMIN/BOARD_ADMIN)
- Create/Edit inline form: School name + Board selector (OSTA_ADMIN only sees board dropdown)
- Schools table: Name, Board ID (monospace), Actions (Edit for managers, Delete for OSTA_ADMIN)

**Scoping:**

- BOARD_ADMIN sees only schools in their board (`user.boardId` filter)
- OSTA_ADMIN/SUPER_ADMIN sees all schools across all boards

**Data Sources:**

- `organizationApi.listSchools(boardId?)` + `organizationApi.listBoards()` (OSTA_ADMIN only)

---

### 15. Tenant Dashboard (`/tenant-overview`)

**Route**: `/tenant-overview`
**Access**: SUPER_ADMIN, OSTA_ADMIN, BOARD_ADMIN (RoleGuard)

**Layout**: Standalone page with stat cards and tables

**Components:**

- Title: "OSTA-Wide Overview" (OSTA_ADMIN) or "Board Overview" (BOARD_ADMIN)
- Stat cards (2-3 column grid): Total Boards, Total Schools, Avg Schools/Board
  - Card: `bg-dashboard-card rounded-xl p-5 border border-white/10`, value in `text-3xl font-bold`
- Boards table (OSTA_ADMIN only): Board Name, Schools count
- Schools table: School Name, Board (OSTA_ADMIN only)

**Scoping:**

- OSTA_ADMIN: Fetches all boards + all schools
- BOARD_ADMIN: Fetches only schools in their board

---

### 16. Absence Management (`/absences`)

**Route**: `/absences`
**Access**: All admin roles

**Layout**: Standalone page with date filter and table

**Components:**

- Header: "Absence Reports" with date filter input and "All dates" clear button
- Table: Student ID, Trip Date, Route type badge (AM/PM/Both), Status badge (PENDING amber, CONFIRMED green, REJECTED red), Notes, Reported timestamp, Actions
- SCHOOL_ADMIN actions on PENDING records: Confirm, Reject (with inline notes input)
- All users: Remove action

**Status Badge Styling:**

- PENDING: `bg-amber-500/10 text-amber-400 border border-amber-500/20`
- CONFIRMED: `bg-green-500/10 text-green-400 border border-green-500/20`
- REJECTED: `bg-red-500/10 text-red-400 border border-red-500/20`

**Data Sources:**

- `absenceApi.listAbsences(date?, schoolId?)` with school scoping for SCHOOL_ADMIN
- Actions: `absenceApi.confirmAbsence()`, `absenceApi.rejectAbsence()`, `absenceApi.deleteAbsence()`

---

### 17. Fleet Assignments (`/fleet-assignments`)

**Route**: `/fleet-assignments`
**Access**: All admin roles

**Layout**: Standalone page with proposal form and table

**Components:**

- Header: "Fleet Assignments" with "Create Proposal" button (OSTA_ADMIN only, Plus icon)
- Proposal form (expandable, 2-column grid): School ID, Route ID, Vehicle ID, Effective Date
- Assignments table: School, Route, Vehicle, Effective Date, Status badge, Created timestamp, Actions
- SCHOOL_ADMIN actions on PROPOSED: Accept, Reject (with inline notes)
- ACCEPTED records: Download PDF button (Download icon)

**Status Badge Styling:**

- PROPOSED: amber
- ACCEPTED: green
- REJECTED: red
- SUPERSEDED: slate/gray

**PDF Download:**

- Fetches blob from `/api/v1/documents/fleet-assignment/{id}/pdf`
- Creates temporary anchor for browser download

**Data Sources:**

- `fleetAssignmentApi.list()` via React Query
- SCHOOL_ADMIN filter: only shows assignments matching `user.schoolId`
- Actions: `fleetAssignmentApi.propose()`, `fleetAssignmentApi.accept()`, `fleetAssignmentApi.reject()`

---

## Real-time Features

### Data Refresh Patterns

| Feature                       | Method                         | Interval       |
| ----------------------------- | ------------------------------ | -------------- |
| Dashboard alerts              | React Query polling            | 2 seconds      |
| Dashboard fleet data          | React Query polling            | 2 seconds      |
| Route monitoring              | React Query polling            | 10 seconds     |
| Student presence              | WebSocket + query invalidation | Real-time push |
| Alert history (Notifications) | React Query polling            | 30 seconds     |

### WebSocket Integration

- `presenceWs.connect()` on Students page (presence tab)
- On message: `queryClient.invalidateQueries({ queryKey: queryKeys.presence.all })`
- Cleanup on tab switch or unmount

### Mock Mode

- Controlled by `VITE_USE_MOCK` environment variable
- API barrel (`services/api/index.ts`) conditionally exports mock or real implementations
- Visual indicators: Amber "Mock Data Active" badge in Dashboard header, "Mock Mode Active" pill on Login page with exit button
- Mock data stored in `services/mock/data/`, handlers in `services/mock/handlers/`

---

## Responsive Behavior

- **Sidebar**: Collapsible to icon-only mode with smooth width transition
- **Dashboard**: Floating panels are draggable and resizable; positions persisted in localStorage
- **Routes page**: Grid switches from `grid-cols-1` to `lg:grid-cols-3`
- **Tables**: Wrapped in `overflow-x-auto` for horizontal scrolling on small screens
- **Filter bars**: Use `flex-wrap` for graceful wrapping on narrow viewports
- **Settings cards**: Stack vertically with consistent spacing
- **Invite/Create forms**: Use `grid-cols-1 sm:grid-cols-2` for responsive grid layouts

---

## ParentPortal

_Source: `docs/UiDesign/ParentPortal.md`_

# Parent Portal: UI Design Specification

## Overview

The Parent Portal is a React web application built with Vite, React Router v6, TanStack React Query, Tailwind CSS, and Leaflet for mapping. It provides parents with real-time visibility into their children's school bus status, live GPS tracking, alert notifications, absence reporting, and notification preference management.

The portal uses a **dual-tone design**: a dark glassmorphic aesthetic (inherited from the admin dashboard) for data-rich pages like the Dashboard and Notifications, and a clean light theme for form-centric pages like Absence Reporting and the Login page.

### Visual Identity

The Parent Portal blends tactical dark-mode elements with consumer-friendly design. The navigation bar uses `glass-card` glassmorphism. Dashboard child cards use `glass-card` styling. The Map page is a full-viewport interactive map. Form pages (Login, Absence Report) use a conventional light theme with white backgrounds.

---

## Core UI Pillars

### 1. Dual-Tone Design

- **Dark pages** (Dashboard, Notifications, Settings): Dark backgrounds, glassmorphic cards, `text-white` / `text-slate-400`
- **Light pages** (Login, Absence Report): White backgrounds, gray-50 base, standard form styling

### 2. Real-Time Data

- GPS location tracking via SSE (Server-Sent Events) with REST polling fallback
- Alert streaming via SSE with auto-reconnect
- React Query polling for child status (15s) and alert history (30s)

### 3. Mobile-First Responsive

- Responsive navigation with hamburger menu on mobile (`sm:hidden`)
- Card grid: `md:grid-cols-2 lg:grid-cols-3`
- Full-viewport map with overlay controls

---

## Design Tokens & Palette

### Colors

| Token           | Value                                 | Usage                                     |
| --------------- | ------------------------------------- | ----------------------------------------- |
| Indigo-500      | `#6366f1`                             | Primary brand, active elements, gradients |
| Purple-400      | `#c084fc`                             | Brand gradient (indigo-to-purple)         |
| Blue-600        | `#2563eb`                             | Buttons, links, primary actions           |
| Pink-500        | `#ec4899`                             | Alert indicators, emergency highlights    |
| Emerald-400/500 | `#34d399`/`#10b981`                   | Success states, "at school" status        |
| Amber-400/500   | `#fbbf24`/`#f59e0b`                   | Warnings, delayed bus status              |
| Slate-900/400   | Navigation background, secondary text |
| White           | Primary text on dark backgrounds      |

### Typography

- **Font**: System sans-serif (Tailwind defaults)
- **Sizes**: `text-3xl` for page titles, `text-xl` for card headings, `text-sm` for body, `text-xs` for metadata, `text-[10px]` for tactical labels
- **Weights**: `font-extrabold` for login title, `font-bold` for headings, `font-semibold` for emphasis

---

## Navigation Structure

### Layout Component (`components/Layout.tsx`)

The Layout is a persistent wrapper around all authenticated pages, providing a sticky top navigation bar and a centered content area.

**Desktop Navigation (sm+):**

- Left: Bus icon + "Parent Portal" gradient text (`bg-gradient-to-r from-indigo-400 to-purple-400`)
- Center links: "Report Absence" (ClipboardX icon)
- Right icons: Notifications bell (with pink dot for active alerts), Settings gear
- User section: Name, "PARENT" label, Logout button

**Mobile Navigation:**

- Hamburger menu (`Menu`/`X` icons) toggles mobile drawer
- Links: Dashboard, Report Absence, Notifications (with "Alert" badge), Settings
- User info section with profile icon, name, email
- Sign out button

**Alert Badge:**

- `useAlerts(routeIds)` hook checks for active emergency alerts across all children's routes
- Pink dot indicator: `bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]`

**Main Content:**

- `<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">` wrapping `<Outlet />`

---

## Authentication & Route Protection

```
App.tsx
  QueryClientProvider
    BrowserRouter
      AuthProvider
        Routes
          /login -> Login (public)
          / -> ProtectedRoute > Layout
            /dashboard -> Dashboard
            /map -> MapPage
            /notifications -> Notifications
            /absence -> AbsenceReport
            /settings -> Settings
          /* -> redirect to /dashboard
```

**ProtectedRoute**: Checks `useAuth().user` -- redirects to `/login` if null, shows "Loading..." during auth check.

---

## Page Specifications

### 1. Login Page (`/login`)

**Route**: `/login` (public)
**Access**: Unauthenticated users only

**Layout**: Centered form on light gray background (`bg-gray-50`), no Layout wrapper.

**Components:**

- Logo: Blue-600 circle with Bus icon
- Title: "Sign in to your account" (`text-3xl font-extrabold text-gray-900`)
- Subtitle: "Parent Portal" (`text-gray-600`)
- Form: White card with shadow (`bg-white py-8 px-4 shadow sm:rounded-lg`)
  - Email input with Mail icon
  - Password input with Lock icon
  - Error alert: `bg-red-50` with red text
  - Submit button: `bg-blue-600 hover:bg-blue-700` full width
  - Demo hint: "For demo purposes, use any email/password."

**Styling:**

- Input fields: `border-gray-300 rounded-md py-2 border` with `focus:ring-blue-500`
- Submit button: `rounded-md shadow-sm text-white bg-blue-600`

---

### 2. Dashboard (`/dashboard`)

**Route**: `/dashboard`
**Access**: Authenticated parents

**Layout**: Standard Layout wrapper with padded content

**Components:**

- Page title: "My Children" (`text-3xl font-bold text-white`)
- Subtitle: "Real-time tracking and student presence overview."

**Active Alert Banner:**
When alerts exist for any child's routes, a prominent banner is shown per alert:

- Container: `rounded-2xl bg-pink-500/10 border border-pink-500/30 backdrop-blur-md`
- AlertTriangle icon (pink, animated pulse)
- Event type label: `font-bold text-lg uppercase tracking-wider text-pink-500`
- Vehicle/Route badges: `bg-pink-500/20 text-pink-300 rounded-full`
- Alert message text
- Affected children names

**Child Cards (grid: `md:grid-cols-2 lg:grid-cols-3`):**
Each child is rendered as a `glass-card` with hover effects:

- Alert ring: `ring-2 ring-pink-500/60` with custom `alert-pulse` keyframe animation
- Header: Avatar image (with blur glow background), child name, school name, alert icon if applicable
- Details grid (2 columns): AM Route (emerald), PM Route (blue), Bus (slate)
  - Labels: `text-[10px] font-bold text-slate-500 uppercase tracking-widest`
- Status badge: Dynamic color based on status
  - `on_bus`: Indigo (`bg-indigo-500/20 text-indigo-400 border border-indigo-500/30`)
  - `at_school`: Emerald (`bg-emerald-500/20 text-emerald-400 border border-emerald-500/30`)
  - `at_home`: Slate (`bg-slate-500/20 text-slate-400 border border-slate-500/30`)
  - `unknown`: Amber (`bg-amber-500/20 text-amber-400 border border-amber-500/30`)
- Status icons: MapPin (on_bus/blue), School (at_school/green), Home (at_home/gray), HelpCircle (unknown/yellow)
- Footer: "Track Bus Live" button with gradient background and ArrowRight icon
  - `tactical-gradient-active shadow-[0_4px_20px_rgba(99,102,241,0.3)]`
  - Hover: scale-[1.02], Active: scale-95

**Empty State:** "No children linked to your account."

**Data Sources:**

- `parentApi.getChildren()` polled every 15 seconds
- `useAlerts(routeIds)` for active emergency alerts across all children's AM/PM routes

**Custom Animation:**

```css
@keyframes alert-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4);
  }
  50% {
    box-shadow: 0 0 20px 4px rgba(236, 72, 153, 0.3);
  }
}
```

---

### 3. Map Page (`/map`)

**Route**: `/map`
**Access**: Authenticated parents
**Entry**: Via "Track Bus Live" button on Dashboard (passes `childId` via router state)

**Layout**: Full-viewport map below the 16-unit (h-16) navigation bar. Fixed positioning: `fixed inset-x-0 bottom-0 top-16 z-40`.

**Map Configuration:**

- Library: React Leaflet with OpenStreetMap tiles
- Default center: Ottawa (45.4215, -75.6972)
- Zoom control disabled (custom controls provided)
- Map instance captured via ref (mirrors admin dashboard pattern)

**Overlay Controls:**

| Element          | Position    | Description                                                                   |
| ---------------- | ----------- | ----------------------------------------------------------------------------- |
| Back button      | Top-left    | White circle with ArrowLeft icon                                              |
| Status panel     | Top-right   | White card showing child name, route name (AM/PM), vehicle, ETA, alert status |
| Map Reset button | Top-center  | Glassmorphic button with RotateCcw icon                                       |
| Legend           | Bottom-left | White panel with bus status colors + stop types + school marker               |

**Map Markers:**

- **Bus marker** (only shown when live, not stale >30s):
  - Custom `divIcon`: Circular colored marker with bus SVG
  - Colors: Normal (#22c55e green), Delayed (#eab308 yellow), Emergency (#ef4444 red)
  - Border color varies by status

- **Stop markers**:
  - Child's stop: Blue (#3b82f6), larger (28px), white border, prominent shadow
  - Other stops: Transparent gray (rgba(156,163,175,0.35)), smaller (22px)
  - Both show person SVG icon with sequence number badge

- **School marker**: Purple (#8b5cf6), 36px, with mortarboard SVG

- **Route polyline**: Blue (#3b82f6) for AM, Amber (#f59e0b) for PM, weight 6, opacity 0.8

**Status Panel Details:**

- Child name (bold), Live/Completed badge
- Route name with AM/PM indicator
- Vehicle ID
- When live: ETA to next stop, last update timestamp
- When alerts present: Colored status badge (Normal/Delayed/Emergency)
- When not live: "Route is not currently active."

**Data Sources & Real-time:**

- `useGpsLocation(routeId)` for both AM and PM routes simultaneously
- SSE-first with REST polling fallback (5s interval when SSE disconnected)
- Stale threshold: 30 seconds (bus marker hidden when data older than 30s)
- Active route selection: Automatically picks whichever route has fresher GPS data
- Route details: `parentApi.getRouteDetails(activeRouteId)` with 5-minute staleTime
- Alerts: `useAlerts(routeIds)` for bus status color derivation

**Map Bounds:**

- Auto-fits on initial load and when active route changes
- Padding: 60px on all sides, maxZoom 15
- "Map Reset" button manually re-fits bounds

---

### 4. Notifications (`/notifications`)

**Route**: `/notifications`
**Access**: Authenticated parents

**Layout**: Standard Layout wrapper

**Components:**

- Header: "Alert History" (`text-3xl font-bold text-white`) with Refresh button (RefreshCw icon)
- Subtitle: "Emergency alerts and safety events for your routes."

**Alert Cards** (vertical list):
Each alert is a `glass-card` with:

- Status icon: AlertTriangle (active, pink, pulsing) or CheckCircle (resolved, emerald)
- Event type badge: Color-coded rounded pill
  - LATE_ARRIVAL: `bg-amber-500/20 text-amber-400 border-amber-500/30`
  - ROUTE_DEVIATION: `bg-orange-500/20 text-orange-400 border-orange-500/30`
  - PANIC_BUTTON: `bg-red-500/20 text-red-400 border-red-500/30`
  - INCIDENT: `bg-pink-500/20 text-pink-400 border-pink-500/30`
- Status badge: Active (pink) or Resolved (emerald)
- Description text
- Metadata: Route ID, Bus ID, Timestamp

**Active Alert Highlight**: `ring-1 ring-pink-500/40`

**Empty State**: ShieldAlert icon + "No alerts yet" + subtitle

**Data Sources:**

- `parentApi.getAlertHistory()` polled every 30 seconds via React Query
- Manual refresh via refetch button

---

### 5. Absence Report (`/absence`)

**Route**: `/absence`
**Access**: Authenticated parents

**Layout**: Standard Layout wrapper, max-width `max-w-lg`

**Design**: Light theme with standard form controls (white backgrounds, gray borders)

**Components:**

- Title: "Report an Absence" (`text-2xl font-bold text-gray-900`)
- Subtitle: "Let the driver and school know your child will not be riding the bus."
- Success banner: Green border with CheckCircle icon
- Error banner: Red border with AlertTriangle icon
- Form fields:
  - Child selector: Dropdown populated from `user.children`
  - Date: Date input (min: today)
  - Route: Dropdown with options: "Morning route only (AM)", "Afternoon route only (PM)", "Full day (both routes)"
  - Notes: Textarea (optional, 500 char max)
- Submit button: `bg-blue-600 hover:bg-blue-700 text-white rounded-lg`

**Empty State** (no children): "No children associated with your account."

**Data Flow:**

- `parentApi.reportAbsence({ studentId, tripDate, routeType, notes })`
- Success message: "Absence reported successfully. The driver and school have been notified."

---

### 6. Settings (`/settings`)

**Route**: `/settings`
**Access**: Authenticated parents

**Layout**: Standard Layout wrapper, dark theme

**Components:**

- Title: "Notification Settings" (with Settings icon in indigo-400)
- Subtitle: "Choose how you want to be notified about your child's bus activity."

**Event Type Cards** (`glass-card rounded-xl`):
| Event | Description | Locked? |
|---|---|---|
| Child Boarded | When your child boards the bus | No |
| Child Alighted | When your child gets off the bus | No |
| Emergency Alerts | Safety alerts for your child's route | Yes (Always On, Shield icon) |

Each card shows channel toggle buttons:

- **Push** (Bell icon)
- **Email** (Mail icon)
- Active state: `bg-indigo-600/20 text-indigo-300 border-indigo-500/30`
- Inactive state: `bg-slate-800/50 text-slate-500 border-white/5`
- Locked events: `opacity-60 cursor-not-allowed`

**Emergency "Always On" Badge**: `bg-amber-900/30 text-amber-300 border border-amber-500/20 rounded-full`

**Save Button**: `bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl`
**Success Message**: `bg-emerald-900/20 border border-emerald-500/20 text-emerald-300`

**Data Sources:**

- `parentApi.getNotificationPreferences()` via React Query
- `parentApi.updateNotificationPreferences(prefs)` via mutation
- Defaults: PUSH enabled for BOARD/ALIGHT, EMERGENCY always all-channels-on

---

## Real-time Features

### GPS Location Hook (`useGpsLocation.ts`)

Monitors GPS location for a single route via **SSE push with REST polling fallback**.

**Architecture:**

1. Opens SSE connection to `/api/v1/routes/{routeId}/location/stream` with credentials
2. On SSE message: Parses GPS data, pushes directly into React Query cache (no round-trip)
3. On SSE error: Falls back to REST polling at 5-second intervals
4. REST endpoint: `parentApi.getLiveLocation(routeId)`
5. 404/inactive route: Returns `null` silently (no console errors)
6. 403: Returns `null` (session mismatch handled by auth redirect)

**State:**

- `location: BusLocationUpdate | null` -- latest GPS data
- `sseConnected: boolean` -- whether SSE is actively connected

### Alert Stream Hook (`useAlertStream.ts`)

Subscribes to emergency alerts SSE stream with auto-reconnect.

**Architecture:**

1. Opens SSE connection to `/api/v1/parent/alerts/stream` with credentials
2. Filters alerts to only matching routeIds
3. On error: Auto-reconnects after 5 seconds
4. Cleanup: Closes EventSource and clears reconnect timer on unmount

**State:**

- `latestAlert: ActiveAlert | null`
- `connected: boolean`
- `error: string | null`

### Alert Polling Hook (`useAlerts`)

Used by Dashboard and Map pages to collect active alerts for display.

- Collects unique route IDs from all children's AM/PM routes
- Merges SSE stream alerts with polling-based alert data

---

## Responsive Behavior

- **Navigation**: Full horizontal bar on desktop (`sm:flex`), hamburger menu on mobile (`sm:hidden`)
- **Dashboard cards**: Single column on mobile, 2 columns on tablet (`md:grid-cols-2`), 3 on desktop (`lg:grid-cols-3`)
- **Map page**: Full viewport below navbar, overlay controls positioned absolutely
- **Absence form**: `max-w-lg` with `px-4 sm:px-0` for mobile padding
- **Settings cards**: Full-width stacked vertically

---

## DriverApp

_Source: `docs/UiDesign/DriverApp.md`_

# Driver App: UI Design Specification

## Overview

The Driver App is a React Native mobile application built with Expo, React Navigation (native stack), Zustand for state management, and `react-native-maps` for GPS visualization. It enables school bus drivers to manage their route sessions, track GPS location, manage student boarding/alighting rosters, respond to admin alert messages, and trigger emergency panic alerts.

The application uses a **clean, functional mobile design** with white card backgrounds, iOS-style system colors, and practical touch targets. Unlike the admin dashboard's dark tactical theme, the Driver App prioritizes readability and quick interaction under real-world driving conditions.

### Platform Considerations

- Built with Expo/React Native for cross-platform (iOS/Android) deployment
- Uses `expo-location` for GPS tracking with high accuracy
- BLE (Bluetooth Low Energy) scanning for automated student presence detection
- Offline-first architecture with queued event sync
- `react-native-safe-area-context` for safe area handling
- `react-native-svg` for rendering SVG avatars

---

## Core UI Pillars

### 1. Simplicity Under Pressure

- Large touch targets (minimum 50px height for buttons)
- Clear, high-contrast text (dark on white)
- Minimal navigation depth (3 levels max)
- Confirmation dialogs for critical actions (panic, end route)

### 2. Real-Time Awareness

- Live GPS tracking with map visualization
- BLE scanning status indicators
- Offline mode banner with sync indicators
- Info request badge counts

### 3. Offline Resilience

- Optimistic UI updates with pending sync indicators
- Offline banner notification
- Automatic queue flush on reconnection via `ConnectivityService`

---

## Design Tokens & Palette

### Colors

| Token                | Value                                           | Usage                                                          |
| -------------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| Blue `#007AFF`       | iOS system blue                                 | Primary actions, buttons, links, stop markers                  |
| Green `#34C759`      | iOS system green                                | BLE status, boarded status, board-all button                   |
| Orange `#FF9500`     | iOS system orange                               | Alighted status, end route button, alight-all, incident report |
| Red `#FF3B30`        | iOS system red                                  | Panic button, logout text, delete actions, error badges        |
| Amber `#f59e0b`      | Bus arrow marker, incident button, alert badges |
| Indigo `#6366f1`     | Messages button                                 |
| Purple `#8b5cf6`     | School markers                                  |
| Gray `#666` / `#999` | Secondary text, not-boarded status              |
| Light BG `#f5f5f5`   | Screen backgrounds                              |
| White `#fff`         | Card backgrounds, button text                   |

### Typography

- **Title**: 32px bold (Login), 24px bold (screen headers)
- **Subtitle**: 16px, color #666
- **Body**: 16px semibold for names, 14px for details
- **Small**: 13px for status text, 11px for badges
- **Weight**: Bold (700) for emphasis, Semibold (600) for names

### Spacing

- Screen padding: 20px
- Card padding: 20px
- Card border radius: 12px (cards), 8px (buttons), 10px (action buttons)
- Card shadows: `shadowOpacity: 0.1, shadowRadius: 5, elevation: 3`

---

## Navigation Structure

### Stack Navigator (React Navigation)

```
App.tsx
  SafeAreaProvider
    NavigationContainer
      Stack.Navigator
        [Unauthenticated]
          Login (headerShown: false)
        [Authenticated]
          RouteSelect (title: "My Routes")
          ActiveRoute (headerShown: false)
          Roster (title: "Roster", presentation: "modal")
          AlertMessages (title: "Messages", presentation: "modal")
```

**Authentication Gate**: Conditionally renders either the Login screen or the authenticated stack based on `useDriverStore.isAuthenticated`.

**Session Restoration**: On app launch, `AuthService.getToken()` checks for persisted token and restores the session via `AuthService.restoreSession()`.

**401 Handler**: `setOnUnauthorized()` registers a callback that forces logout on token expiry.

**Connectivity Monitoring**: `ConnectivityService.startMonitoring()` tracks network state and flushes offline queues on reconnect.

---

## State Management (`useDriverStore.ts`)

The app uses a single Zustand store with the following state shape:

```typescript
interface DriverState {
  driver: Driver | null;
  isAuthenticated: boolean;
  activeRoute: Route | null;
  students: Student[];
  stops: Stop[];
  routeDirection: string; // 'AM' or 'PM'
  rosterLoadState: RosterLoadState; // 'idle' | 'loading' | 'loaded' | 'error'
  rosterError: string | null;
  isOffline: boolean;
}
```

**Key Actions:**

- `login(email, pass)`: Authenticates via `AuthService.login()`
- `logout()`: Clears all state, calls `AuthService.logout()`
- `setActiveRoute(route)`: Starts route lifecycle, fetches roster, resets students to NOT_BOARDED. For PM routes, auto-boards all students after load.
- `endRoute()`: Auto-alights remaining boarded students, records route completion, resets state.
- `toggleStudentStatus(studentId)`: Cycles NOT_BOARDED -> BOARDED -> ALIGHTED -> NOT_BOARDED. Sends presence event to server with optimistic update.
- `boardAll()` / `alightAll()`: Bulk status transitions with server sync for each student.
- `refreshRoster()`: Re-fetches roster from server.

**Optimistic Updates:**

- Student status changes are applied immediately to the UI
- `pendingSync: true` flag shown while awaiting server confirmation
- `serverConfirmed: true` set on successful server response

---

## Screen Specifications

### 1. Login Screen

**Navigation**: Stack entry point (unauthenticated)
**Header**: Hidden (`headerShown: false`)

**Layout**: Centered vertically, white background, 20px padding.

**Components (React Native):**

- `Text` title: "Driver App" (32px bold, centered, color #333, marginBottom 40)
- `TextInput` email: 50px height, 1px border (#ddd), borderRadius 8, paddingHorizontal 15, fontSize 16
  - `autoCapitalize="none"`, `keyboardType="email-address"`
- `TextInput` password: Same styling, `secureTextEntry`
- `TouchableOpacity` login button: `backgroundColor: '#007AFF'`, 50px height, borderRadius 8, centered
  - Shows `ActivityIndicator` (white) when loading
  - Button text: "Log In" (white, 18px, fontWeight 600)

**Error Handling:**

- Empty fields: `Alert.alert('Error', 'Please enter email and password')`
- Login failure: `Alert.alert('Login Failed', error.message)`

**Data Flow:**

- `useDriverStore.login(email, password)` -> `AuthService.login()`
- On success: Store sets `isAuthenticated: true`, stack switches to authenticated screens

---

### 2. Route Select Screen

**Navigation**: `RouteSelect` (title: "My Routes")
**Entry**: First authenticated screen

**Layout**: Full-screen list with header, light gray background (#f5f5f5).

**Components:**

- Welcome header: "Welcome, {driver.name}" (24px bold, marginTop 20)
- Subtitle: "Select a route to start:" (16px, color #666)
- `FlatList` of route cards
- Logout button: "Log Out" (red text #FF3B30, centered)

**Route Card (`TouchableOpacity`):**

- White background, 20px padding, borderRadius 12
- Shadow: `shadowOpacity: 0.1, shadowRadius: 5, elevation: 3`
- Content:
  - Route name (18px bold)
  - School name (14px, color #555)
  - Start time (formatted to 12-hour AM/PM)
  - Direction badge: Positioned top-right (16px bold, color #007AFF)

**Route Selection Flow:**

1. Tap card -> `Alert.alert('Start Route', 'Start {name} ({direction})?')`
2. Cancel / Start options
3. On Start: `setActiveRoute(route)` + `navigation.navigate('ActiveRoute')`

---

### 3. Active Route Screen

**Navigation**: `ActiveRoute` (headerShown: false)
**Entry**: After selecting a route

**Layout**: Full-screen map with bottom control panel.

**Map (`react-native-maps MapView`):**

- Full height minus control panel
- Region: Defaults to Ottawa (Greenfield Elementary demo area: 45.3506, -75.7934)
- Auto-fits to route bounds when polyline/stops/school available (60px edge padding)

**Map Markers:**

| Marker        | Visual                                         | Description                                |
| ------------- | ---------------------------------------------- | ------------------------------------------ |
| Bus arrow     | Yellow (#f59e0b) directional triangle with dot | Current GPS position, rotates with heading |
| Stop markers  | Blue (#007AFF) circles with sequence number    | All stops with lat/lng, 24px               |
| School marker | Purple (#8b5cf6) circle with "S" letter        | School location, 28px                      |

- **Bus arrow**: Custom View with CSS triangle (`borderLeftWidth/borderRightWidth/borderBottomWidth`) and dot
  - `flat={true}`, `rotation={heading}` for directional orientation
- **Route polyline**: Blue (#3b82f6) for AM, Amber (#f59e0b) for PM, strokeWidth 5

**Bottom Control Panel:**
White background, top border radius 20, shadow elevation 10.

- **Info Panel** (centered):
  - Route title (20px bold)
  - Direction badge: "AM Route" or "PM Route" (14px, #666)
  - BLE status: "BLE Scanning Active" (green #34C759) or "Bluetooth permission denied" warning (orange #FF9500)

- **Button Row** (3 equal buttons, horizontal):
  | Button | Color | Action |
  |---|---|---|
  | Roster | Blue #007AFF | Navigate to Roster modal |
  | Messages | Indigo #6366f1 | Navigate to AlertMessages modal |
  | End Route | Orange #FF9500 | End route with confirmation |
  - Messages button has a red badge circle for unread info requests
  - Badge: `backgroundColor: '#ef4444'`, borderRadius 10, positioned top-right

- **Alert Row** (2 buttons, horizontal):
  | Button | Color | Action |
  |---|---|---|
  | Report Incident | Amber #f59e0b | Opens incident report modal |
  | PANIC | Red #FF3B30 | Triggers panic alert with double confirmation |

**Incident Report Modal:**
Custom overlay (`position: 'absolute'`, full screen, `backgroundColor: 'rgba(0,0,0,0.5)'`):

- White card (borderRadius 16, 85% width)
- Title: "Report Incident" (20px bold)
- Subtitle: "Briefly describe the incident:"
- Multi-line TextInput (minHeight 80, backgroundColor #f5f5f5, borderRadius 12)
- Cancel button (gray bg) and Report button (amber bg)

**Panic Flow:**

1. Tap PANIC button
2. `Alert.alert('Emergency', 'Are you sure you want to trigger a panic alert?')`
3. Cancel / "YES, PANIC" (destructive style)
4. Gets current GPS location
5. `EmergencyService.triggerPanic(vehicleId, routeId, position, driverId)`
6. `Alert.alert('Alert Sent', 'Help is on the way.')`

**End Route Flow:**

1. Tap End Route
2. Confirmation: "Are you sure you want to end this route? All tracking will stop and boarded students will be alighted."
3. Cancel / "End Route" (destructive)
4. `endRoute()` -> auto-alights all boarded students, completes lifecycle
5. `navigation.popToTop()` back to RouteSelect

**GPS Tracking:**

- `GPSService.requestPermissions()` on mount
- `GPSService.startTracking(routeId, vehicleId, driverId)` for server-side location publishing
- `expo-location.watchPositionAsync()` for local bus marker updates (3s interval, 5m distance)
- High accuracy mode

**BLE Scanning:**

- `useBleScanning(routeId, vehicleId, schoolId, enabled)` hook
- Starts scanning on mount, stops on unmount (battery-conscious: NFR-BATT-001)
- `BleService.onStateChange()` subscription for real-time state

**Info Request Polling:**

- Every 30 seconds: Checks active alerts for INFO_REQUESTED audit entries
- Badge count displayed on Messages button

---

### 4. Roster Screen

**Navigation**: `Roster` (title: "Roster", presentation: "modal")
**Entry**: From Active Route "Roster" button

**Layout**: Full-screen SectionList with sticky headers, light gray background.

**Components:**

- Header: "Student Roster" (24px bold, white background)
- Bulk action buttons (contextual):
  - PM route with not-boarded students: "Board All Students" (green #34C759)
  - AM route with boarded students: "Alight All Students" (orange #FF9500)
- Offline banner: Yellow (#FFF3CD) with "Offline -- changes will sync when reconnected"
- Error banner: Red (#F8D7DA) with error text and "Retry" button
- Empty state: "No students on this route yet." with "Refresh" button

**Section Headers:**

- Background: #e8eef4, 1px bottom border (#d0d8e0)
- Left: "Stop {sequence}: {stopName}" (15px bold, #2c3e50)
- Right: Arrival time (13px, #607d8b)
- Sticky headers enabled

**Student Cards:**
Each student is a horizontal row with:

- **Avatar**: Either:
  - Image from URL (44px round)
  - SVG avatar (rendered via `SvgXml` from `react-native-svg`)
  - Initials fallback (colored circle, rotating through 5 colors: Blue/Green/Orange/Purple/Red)
- **Student info**: Name (16px semibold) + status badge
- **Action button**: Dynamic based on current status

**Student Status Cycle & Colors:**
| Status | Badge Color | Button Label | Button Color |
|---|---|---|---|
| NOT_BOARDED | Gray #999 | Board | Gray #999 |
| BOARDED | Green #34C759 | Alight | Green #34C759 |
| ALIGHTED | Orange #FF9500 | Reset | Orange #FF9500 |

- `pendingSync` indicator: "..." text next to button label

**Section Building Logic (`buildSections`):**

1. Groups students by their `stopId`
2. Sorts sections by stop sequence
3. Filters out empty sections
4. Appends "Other Students" section for unassigned students

**Interactions:**

- Pull-to-refresh: Calls `refreshRoster()`
- Tap action button: `toggleStudentStatus(studentId)` cycles through states
- Board All / Alight All: Confirmation dialog -> bulk status update

**Data Sources:**

- Students and stops from `useDriverStore` (loaded during `setActiveRoute`)
- `RosterService.getRouteRoster(routeId)` fetches server-confirmed roster with stop data

---

### 5. Alert Messages Screen

**Navigation**: `AlertMessages` (title: "Messages", presentation: "modal")
**Entry**: From Active Route "Messages" button

**Layout**: Full-screen FlatList with pull-to-refresh.

**Components:**

- Header: "Alert Messages" (24px bold, white background)
- Subtitle: "Active alerts for your route. Respond to admin info requests here."
- Empty state: Green checkmark + "No active alerts on this route." + Refresh button

**Alert Cards:**
Each active alert is a white card (borderRadius 16) containing:

- **Alert header row**: Event type badge (amber or red if info-requested) + timestamp
  - Badge: Uppercase, letter-spacing 0.5, 12px bold white text
  - Urgent (info-requested): Red (#ef4444) background
  - Normal: Amber (#f59e0b) background
- **Description text**: 14px, #333
- **Info request banner** (if applicable): Blue (#dbeafe) background
  - Text: "Admin has requested additional information" (#1d4ed8)

**Message Thread (Chat Bubbles):**
Audit log entries filtered to INFO_REQUESTED and STATUS_UPDATE:

- Admin messages (non-driver): Left-aligned, blue background (#dbeafe)
- Driver messages: Right-aligned, green background (#dcfce7)
- Each bubble shows:
  - Action label with emoji and color (e.g., "Info Requested" blue, "Response" green)
  - Notes text (14px, lineHeight 20)
  - Timestamp + actor role (11px, #999)

**Action Labels:**
| Action | Label | Color |
|---|---|---|
| INFO_REQUESTED | "Info Requested" | #3b82f6 |
| STATUS_UPDATE | "Response" | #10b981 |
| CONFIRMED | "Confirmed" | #22c55e |
| FALSE_ALARM | "False Alarm" | #ef4444 |
| RESOLVED | "Resolved" | #6b7280 |
| CREATED | "Created" | #f59e0b |
| ESCALATED | "Escalated" | #ef4444 |

**Reply Input:**

- Bottom of each card: TextInput (flex 1, #f5f5f5 bg, borderRadius 12) + Send button
- Send button: Blue #007AFF, borderRadius 12, "Send" text
- Disabled state with ActivityIndicator while sending
- Empty message validation: `Alert.alert('Empty Message', 'Please type a response before sending.')`

**Data Flow:**

- `AlertService.getActiveAlerts(routeId)` fetches active alerts
- `AlertService.getAlertAuditLog(alertId)` fetches thread for each alert
- `AlertService.addStatusUpdate(alertId, text, driverId)` sends driver response
- Polled every 15 seconds for new messages

---

## BLE Scanning Hook (`useBleScanning.ts`)

**Purpose**: Manages Bluetooth Low Energy scanning lifecycle for automated student presence detection during active routes.

**Hook Signature:**

```typescript
function useBleScanning(
  routeId: string,
  vehicleId: string,
  schoolId: string,
  enabled: boolean,
): { scanState: BleScanState };
```

**Behavior:**

1. Subscribes to `BleService.onStateChange()` for real-time state updates
2. If enabled and all IDs provided: `BleService.startScanning(routeId, vehicleId, schoolId)`
3. On unmount: `BleService.stopScanning()` + unsubscribe
4. Re-runs when routeId/vehicleId/schoolId/enabled change

**Scan States:**

- `scanning`: Active BLE scan (shown as green text on Active Route screen)
- `permission_denied`: Bluetooth permission not granted (shown as orange warning)
- Other states handled by BleService internally

**Battery Consideration (NFR-BATT-001):**

- BLE scanning only active while a route is running
- Cleanup stops scanning on unmount to prevent rogue background activity

---

## Offline Architecture

### Connectivity Service

- `ConnectivityService.startMonitoring(setOffline)`: Watches network state
- `ConnectivityService.stopMonitoring()`: Cleanup on app unmount
- Updates `isOffline` flag in store

### Offline Queue Service

- Presence events that fail to send are queued locally
- Queue is flushed automatically when connectivity is restored
- `pendingSync` flag on student records indicates un-synced changes

### Visual Indicators

- **Offline banner** on Roster screen: Yellow background with warning text
- **Sync indicator** on student action buttons: "..." text next to button label
- Optimistic UI: Status changes are reflected immediately regardless of connectivity

---

## Responsive Behavior

As a React Native application, the Driver App adapts to different device sizes automatically:

- **Screen rotation**: Map view fills available space; control panel remains at bottom
- **Modal screens** (Roster, Messages): Presented as native modal overlay
- **Safe areas**: `SafeAreaProvider` handles notch/home indicator padding
- **Touch targets**: All buttons minimum 50px height for glove/driving-friendly operation
- **Keyboard handling**: TextInputs in modals and reply fields support keyboard avoidance
- **FlatList/SectionList**: Native scrolling performance with sticky section headers
