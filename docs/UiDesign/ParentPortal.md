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
