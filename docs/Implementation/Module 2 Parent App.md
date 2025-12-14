This version assumes the recommended stack:

✅ **Web:** React + TypeScript  
✅ **Mobile:** Flutter (or React Native if you choose later)  
✅ **Real‑time:** SSE (Server‑Sent Events) for lightweight streaming  
✅ **Backend:** Uses the GPS Tracking Service APIs from Module 1  
✅ **Notifications:** FCM + OneSignal/Courier (abstracted for now)  

# 👨‍👩‍👧 **Module 2 — Parent App (Web + Mobile)**  
**Goal:** Build a standalone Parent App that allows parents to view their child’s bus location in real time, receive notifications, and manage basic preferences.

This module must be **independent**, **self-contained**, and **deployable on its own**, even though it lives inside a monorepo.

---

# ✅ **SECTION A — Developer Specification (Copilot Developer)**

## 1. **Tech Stack**
### **Web App**
- React + TypeScript  
- Vite or Next.js (choose one; Vite recommended for simplicity)  
- TailwindCSS or Material UI (developer choice)  
- Map rendering: Mapbox GL JS or Leaflet  

### **Mobile App**
- Flutter 

### **Real-time Updates**
- **SSE (Server-Sent Events)** for live bus location  
- Polling fallback every 10 seconds  

### **Notifications**
- FCM for push notifications  
- OneSignal/Courier for multi-channel (abstracted for now)

---

## 2. **Module Folder Structure**

Place under `/apps/parent-app/`:

```
/apps/parent-app
  /web
    /src
      /components
      /pages
      /hooks
      /services
      /context
      /types
      /assets
    package.json
    vite.config.ts
    tsconfig.json

  /mobile
    /lib
      /screens
      /widgets
      /services
      /models
    pubspec.yaml

  README.md
```

---

## 3. **Features to Implement (MVP)**

### ✅ **1. Parent Login**
- Email + password  
- JWT stored in memory (React context)  
- Refresh token support (optional)

### ✅ **2. Child & Route Overview**
- List of children associated with parent  
- Each child card shows:
  - Child name  
  - Assigned route  
  - Bus number  
  - Status: “On the way”, “At school”, “No data”  

### ✅ **3. Live Bus Map**
- Map centered on bus location  
- Bus icon updates via SSE stream  
- Show:
  - ETA to next stop  
  - Last updated timestamp  
  - Deviation flag (if true, show warning banner)

### ✅ **4. Notifications**
- Subscribe to:
  - Bus approaching stop  
  - Delays  
  - Panic/emergency alerts  
- Manage notification preferences

### ✅ **5. Settings**
- Language (English/French)  
- Notification toggles  
- Logout  

---

## 4. **APIs to Integrate (from Module 1)**

### ✅ **GET `/api/v1/routes/{routeId}/live-location`**
Used for map updates.

### ✅ **GET `/api/v1/routes/{routeId}/history`**
Used for optional “View Today’s Path” screen.

### ✅ **GET `/api/v1/parents/me/children`**
(Stub for now; backend may mock this.)

### ✅ **SSE Endpoint: `/api/v1/routes/{routeId}/live-stream`**
Prototype SSE stream that pushes:

```json
{
  "routeId": "route-456",
  "vehicleId": "bus-123",
  "timestamp": "2025-01-10T14:24:05Z",
  "lat": 45.4215,
  "lng": -75.6972,
  "eta": 3,
  "deviation": false
}
```

---

## 5. **Data Models (Frontend Types)**

### ✅ `Child`
```ts
id: string
name: string
routeId: string
vehicleId: string
```

### ✅ `LiveLocation`
```ts
routeId: string
vehicleId: string
lastUpdate: string
position: { lat: number; lng: number }
etaToNextStopMinutes: number
deviationFlag: boolean
```

### ✅ `NotificationPreference`
```ts
approachingStop: boolean
delays: boolean
emergencies: boolean
```

---

## 6. **User Flows**

### ✅ **Flow 1: Parent Logs In**
1. Parent enters email/password  
2. App calls `/auth/login`  
3. Stores JWT in memory  
4. Redirects to dashboard  

---

### ✅ **Flow 2: View Child’s Bus**
1. Parent selects child  
2. App fetches routeId  
3. App opens SSE stream for live location  
4. Map updates in real time  

---

### ✅ **Flow 3: Receive Notification**
1. Backend sends push via FCM  
2. Parent sees alert on device  
3. Tapping alert opens relevant child’s map  

---

### ✅ **Flow 4: Manage Preferences**
1. Parent opens settings  
2. Toggles notifications  
3. App saves preferences via `/api/v1/parents/me/preferences`  

---

## 7. **Lifecycle Diagrams (Text Version)**

### ✅ **Live Location Streaming**
```
GPS Service → SSE Stream → Parent App → Map Update
```

### ✅ **Notification Lifecycle**
```
GPS/Alerts Service → Notification Service → FCM → Parent Device → Parent App
```

### ✅ **Login Lifecycle**
```
Parent App → Auth API → JWT → Secure Requests → Logout clears token
```

---

# ✅ **SECTION B — Reviewer Checklist (Copilot Reviewer)**

### ✅ **Architecture**
- [ ] React components are modular and reusable  
- [ ] State managed via Context or Zustand/Recoil  
- [ ] SSE implemented with cleanup on unmount  
- [ ] Mobile app follows MVVM or similar pattern  

### ✅ **Security**
- [ ] JWT stored in memory (not localStorage)  
- [ ] HTTPS enforced  
- [ ] No sensitive data logged  

### ✅ **Performance**
- [ ] SSE reconnect logic implemented  
- [ ] Map updates throttled (e.g., 500ms)  
- [ ] Avoid unnecessary re-renders  

### ✅ **Code Quality**
- [ ] TypeScript strict mode  
- [ ] No `any` types  
- [ ] Components small and focused  

### ✅ **Testing**
- [ ] Unit tests for hooks/services  
- [ ] Integration tests for login + map  
- [ ] SSE mocked in tests  

---

# ✅ **SECTION C — Tester Acceptance Criteria (Copilot Tester)**

### ✅ **Login**
- [ ] Valid credentials → dashboard  
- [ ] Invalid credentials → error message  
- [ ] Logout clears session  

### ✅ **Child List**
- [ ] Shows all children  
- [ ] Selecting child loads map  

### ✅ **Live Map**
- [ ] Bus icon updates when SSE sends new data  
- [ ] ETA displayed  
- [ ] Deviation flag triggers warning  

### ✅ **Notifications**
- [ ] App receives FCM push  
- [ ] Tapping notification opens correct screen  

### ✅ **Settings**
- [ ] Preferences persist across sessions  
- [ ] Language toggle updates UI  

---

# ✅ **SECTION D — Future Enterprise Upgrade Path**

### ✅ **Replace SSE with WebSockets**
- For high-frequency updates  
- Supports bidirectional communication  

### ✅ **Add advanced ETA engine**
- ML-based predictions  
- Traffic + weather integration  

### ✅ **Add multi-child, multi-school support**
- Parent with children in different schools  

### ✅ **Add offline mode**
- Cache last known bus location  

### ✅ **Add real-time incident feed**
- Panic alerts  
- Route deviations  
- Mechanical issues  
