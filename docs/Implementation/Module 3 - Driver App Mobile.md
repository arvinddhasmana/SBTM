The **full GitHub‑ready template** for **Module 3 — Driver App**, written in the same structure and precision as Modules 1 and 2.  
You can paste this directly into a GitHub Issue and assign it to Copilot Developer, Reviewer, and Tester agents.

This module is designed to be **independent**, **self‑contained**, and **compatible with the monorepo architecture** you’re building.

---

# ✅ **GITHUB ISSUE TEMPLATE — MODULE 3: Driver App (Mobile)**  
### *(Paste this into a GitHub Issue titled: “Module 3 — Driver App (Mobile)”)*
---

# 🚍 **Module 3 — Driver App (Mobile)**  
**Goal:** Build a standalone mobile Driver App that allows drivers to log in, select a route, send GPS updates, view navigation, manage student roster, and trigger emergency alerts.

This module must be **independent**, **deployable on its own**, and integrate only through public APIs.

---

# ✅ **SECTION A — Developer Specification (Copilot Developer)**

## 1. **Tech Stack**
### **Mobile Framework**
✅ **Flutter (recommended)**  
OR  
✅ React Native (if team prefers JS ecosystem)

### **Native Integrations**
- GPS (high accuracy mode)
- Background location updates
- Camera (optional for video capture in later modules)
- Push notifications (FCM)
- Bluetooth (optional for SmartTag detection in Module 6)

### **Networking**
- REST API calls to GPS Tracking Service (Module 1)
- SSE/WebSocket optional for admin messages (future)

### **State Management**
- Flutter: Riverpod / Bloc  
- React Native: Zustand / Redux Toolkit  

---

## 2. **Module Folder Structure**

Place under `/apps/driver-app/`:

```
/apps/driver-app
  /lib
    /screens
      login_screen.dart
      route_select_screen.dart
      active_route_screen.dart
      roster_screen.dart
      emergency_screen.dart
    /widgets
    /services
      api_service.dart
      gps_service.dart
      auth_service.dart
      emergency_service.dart
    /models
      driver.dart
      route.dart
      location_point.dart
      student.dart
    /providers
    /utils
  pubspec.yaml
  README.md
```

---

## 3. **Features to Implement (MVP)**

### ✅ **1. Driver Login**
- Email + password  
- JWT stored securely  
- Auto‑login if token valid  

---

### ✅ **2. Route Selection**
- Fetch assigned routes  
- Show:
  - Route name  
  - Start time  
  - School  
- Driver taps **Start Route**

---

### ✅ **3. Active Route Screen**
- Map view with:
  - Current location  
  - Route path (optional for MVP)  
  - Next stop + ETA  
- Buttons:
  - **Panic** (red)  
  - **Roster**  
  - **End Route**  

---

### ✅ **4. GPS Tracking**
- Send GPS updates every 5–10 seconds to:  
  `POST /api/v1/locations`
- Handle:
  - Background mode  
  - Offline buffering  
  - Retry logic  

---

### ✅ **5. Student Roster**
- List of students assigned to route  
- Status:
  - Not boarded  
  - Boarded  
  - Alighted  
- Manual check‑in/out (tap to toggle)

---

### ✅ **6. Emergency Button**
- Prominent red button  
- Calls:
  `POST /api/v1/emergency-events` (Module 4)  
- Optionally triggers:
  - Local video recording  
  - Audio alert  

---

## 4. **APIs to Integrate**

### ✅ **POST `/api/v1/locations`**
Send GPS point.

### ✅ **GET `/api/v1/drivers/me/routes`**
Fetch assigned routes.

### ✅ **POST `/api/v1/routes/{routeId}/start`**
Mark route as active.

### ✅ **POST `/api/v1/routes/{routeId}/end`**
End route.

### ✅ **GET `/api/v1/routes/{routeId}/students`**
Fetch roster.

### ✅ **POST `/api/v1/student-presence-events`**
Mark student boarded/alighted.

### ✅ **POST `/api/v1/emergency-events`**
Trigger emergency alert.

---

## 5. **Data Models (Frontend Types)**

### ✅ `Driver`
```ts
id: string
name: string
email: string
assignedRoutes: Route[]
```

### ✅ `Route`
```ts
id: string
name: string
schoolId: string
startTime: string
endTime: string
direction: "AM" | "PM"
```

### ✅ `LocationPoint`
```ts
lat: number
lng: number
timestamp: string
speedKph?: number
headingDeg?: number
accuracyMeters?: number
```

### ✅ `Student`
```ts
id: string
name: string
status: "NOT_BOARDED" | "BOARDED" | "ALIGHTED"
```

---

## 6. **User Flows**

### ✅ **Flow 1: Driver Logs In**
1. Driver enters credentials  
2. App calls `/auth/login`  
3. Stores JWT  
4. Redirects to route selection  

---

### ✅ **Flow 2: Start Route**
1. Driver selects route  
2. App calls `/routes/{id}/start`  
3. GPS tracking begins  
4. Active Route screen opens  

---

### ✅ **Flow 3: GPS Tracking**
1. App collects GPS every 5–10 seconds  
2. Sends to `/locations`  
3. If offline:
   - Buffer points  
   - Retry when online  

---

### ✅ **Flow 4: Student Boarding**
1. Driver opens roster  
2. Taps student → status toggles  
3. App sends presence event  

---

### ✅ **Flow 5: Emergency**
1. Driver presses **Panic**  
2. App sends emergency event  
3. Optional: start video recording  

---

## 7. **Lifecycle Diagrams (Text Version)**

### ✅ **GPS Update Lifecycle**
```
Driver App → GPS Sensor → gps_service → POST /locations → DB → Live Location Cache
```

### ✅ **Route Lifecycle**
```
Start Route → Begin GPS → Student Events → End Route → Archive
```

### ✅ **Emergency Lifecycle**
```
Driver Panic → POST /emergency-events → Admin Alert → Notification to Parents
```

---

# ✅ **SECTION B — Reviewer Checklist (Copilot Reviewer)**

### ✅ **Architecture**
- [ ] Screens separated from business logic  
- [ ] Services abstract API calls  
- [ ] State management consistent (Riverpod/Bloc/Zustand)  

### ✅ **Security**
- [ ] JWT stored securely (not plain text)  
- [ ] HTTPS enforced  
- [ ] No sensitive data logged  

### ✅ **Performance**
- [ ] GPS updates throttled  
- [ ] Background mode implemented correctly  
- [ ] Offline queue works  

### ✅ **Code Quality**
- [ ] Strong typing  
- [ ] No duplicated logic  
- [ ] Reusable components  

### ✅ **Testing**
- [ ] Unit tests for services  
- [ ] Integration tests for login + GPS  
- [ ] Mock GPS for testing  

---

# ✅ **SECTION C — Tester Acceptance Criteria (Copilot Tester)**

### ✅ **Login**
- [ ] Valid credentials → route selection  
- [ ] Invalid credentials → error  
- [ ] Token refresh works  

### ✅ **Route Selection**
- [ ] Assigned routes load  
- [ ] Start Route triggers GPS  

### ✅ **GPS Tracking**
- [ ] Sends updates every 5–10 seconds  
- [ ] Offline buffering works  
- [ ] Resumes after reconnect  

### ✅ **Roster**
- [ ] Students load  
- [ ] Status toggles  
- [ ] Presence events sent  

### ✅ **Emergency**
- [ ] Panic button sends event  
- [ ] UI shows confirmation  

---

# ✅ **SECTION D — Future Enterprise Upgrade Path**

### ✅ **Replace smartphone GPS with telematics**
- Driver app becomes secondary  
- Still used for roster + emergency  

### ✅ **Add turn-by-turn navigation**
- Mapbox or Google Maps SDK  

### ✅ **Add voice alerts**
- “Next stop approaching”  
- “Route deviation detected”  

### ✅ **Add driver behavior monitoring**
- Harsh braking  
- Speeding  
- Idling  

### ✅ **Add digital pre-trip inspection**
- Vehicle checklist  
- Compliance logs  

