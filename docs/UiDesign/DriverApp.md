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
