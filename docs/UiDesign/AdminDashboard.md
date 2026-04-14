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
