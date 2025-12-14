# 🖥️ **Module 7 — Admin Dashboard (Web Application)**  
**Goal:** Build a standalone Admin Dashboard that provides real‑time monitoring, alert management, route visibility, student presence tracking, and video event review.  
This dashboard is the **central command center** for OSTA operations.

This module must be **independent**, **deployable on its own**, and integrate only through public APIs.
- Use docker for containerization of all services and components
- Use docker compose for local development and testing
- Use docker compose for CI/CD pipeline 
---

# ✅ **SECTION A — Developer Specification (Copilot Developer)**

## 1. **Tech Stack**
- **Frontend Framework:** React + TypeScript  
- **UI Library:** Material UI or TailwindCSS  
- **State Management:** Zustand / Redux Toolkit / React Query  
- **Real-time:**  
  - WebSockets (primary)  
  - SSE fallback  
- **Mapping:** Mapbox GL JS or Leaflet  
- **Charts:** Recharts or Chart.js  
- **Auth:** JWT (Admin role)  

---

## 2. **Module Folder Structure**

Place under `/apps/admin-dashboard/`:

```
/apps/admin-dashboard
  /src
    /components
      /map
      /alerts
      /videos
      /presence
      /routes
    /pages
      dashboard.tsx
      alerts.tsx
      routes.tsx
      students.tsx
      videos.tsx
      login.tsx
    /services
      api/
        alerts.api.ts
        routes.api.ts
        presence.api.ts
        video.api.ts
        auth.api.ts
      websocket/
        alerts.ws.ts
        presence.ws.ts
    /context
    /hooks
    /types
    /utils
  package.json
  vite.config.ts
  tsconfig.json
  README.md
```

---

## 3. **Features to Implement (MVP)**

### ✅ **1. Admin Login**
- Email + password  
- JWT stored in memory  
- Role-based access (Admin only)  

---

### ✅ **2. Real-time Dashboard Overview**
- Map showing all active buses  
- Color-coded status:
  - Green → Normal  
  - Yellow → Delay  
  - Red → Emergency  
- Sidebar with:
  - Active alerts  
  - Active routes  
  - Students onboard  

---

### ✅ **3. Alerts Management**
- Real-time WebSocket feed  
- Alerts list with:
  - Timestamp  
  - Route  
  - Vehicle  
  - Event type  
  - Status  
- Alert detail view  
- Mark alert as resolved  

---

### ✅ **4. Route Monitoring**
- View all active routes  
- Click route → open route detail  
- Route detail includes:
  - Live bus location  
  - ETA  
  - Deviation flag  
  - Route history  

---

### ✅ **5. Student Presence Monitoring**
- List of students currently on bus  
- Boarding/alighting history  
- Real-time updates via WebSocket  

---

### ✅ **6. Video Event Review**
- List of video events  
- Filter by route, date, event type  
- View metadata  
- Secure video playback  

---

### ✅ **7. Settings**
- Admin profile  
- Notification preferences  
- System logs (future)  

---

## 4. **APIs to Integrate**

### ✅ **Alerts Service**
- `GET /api/v1/alerts/active`  
- `GET /api/v1/alerts/{id}`  
- `PATCH /api/v1/alerts/{id}/resolve`  
- WebSocket: `/ws/alerts`  

---

### ✅ **GPS Tracking Service**
- `GET /api/v1/routes/{routeId}/live-location`  
- `GET /api/v1/routes/{routeId}/history`  
- `GET /api/v1/routes/active`  

---

### ✅ **Student Presence Service**
- `GET /api/v1/routes/{routeId}/students`  
- WebSocket: `/ws/presence`  

---

### ✅ **Video Service**
- `GET /api/v1/video-events`  
- `GET /api/v1/video-events/{id}`  

---

### ✅ **Auth Service**
- `POST /auth/login`  
- `GET /auth/me`  

---

## 5. **Data Models (Frontend Types)**

### ✅ `Alert`
```ts
id: string
routeId: string
vehicleId: string
timestamp: string
eventType: "PANIC_BUTTON" | "INCIDENT" | "OTHER"
status: "ACTIVE" | "RESOLVED"
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

### ✅ `StudentPresence`
```ts
studentId: string
name: string
status: "BOARDED" | "ALIGHTED"
lastSeen: string
```

### ✅ `VideoEvent`
```ts
id: string
routeId: string
vehicleId: string
timestamp: string
eventType: string
videoUrl: string
thumbnailUrl?: string
```

---

## 6. **User Flows**

### ✅ **Flow 1: Admin Logs In**
1. Admin enters credentials  
2. App calls `/auth/login`  
3. Stores JWT  
4. Redirects to dashboard  

---

### ✅ **Flow 2: Real-time Alert Handling**
1. WebSocket receives new alert  
2. Dashboard updates alert list  
3. Admin clicks alert  
4. Views details  
5. Marks alert as resolved  

---

### ✅ **Flow 3: Route Monitoring**
1. Admin selects route  
2. Map shows live bus location  
3. History tab shows past path  

---

### ✅ **Flow 4: Student Presence**
1. Admin opens presence tab  
2. Real-time updates show boarding/alighting  

---

### ✅ **Flow 5: Video Review**
1. Admin opens video list  
2. Selects event  
3. Secure playback URL retrieved  
4. Video streamed  

---

## 7. **Lifecycle Diagrams (Text Version)**

### ✅ **Alert Lifecycle**
```
Emergency Event → Alerts Service → WebSocket → Admin Dashboard → Resolve → DB Update
```

### ✅ **Route Monitoring Lifecycle**
```
GPS Service → Live Location API → Admin Dashboard → Map Update
```

### ✅ **Student Presence Lifecycle**
```
Driver App → Presence Service → WebSocket → Admin Dashboard
```

### ✅ **Video Review Lifecycle**
```
Driver App/Dashcam → Video Service → Admin Dashboard → Playback
```

---

# ✅ **SECTION B — Reviewer Checklist (Copilot Reviewer)**

### ✅ **Architecture**
- [ ] Components modular and reusable  
- [ ] State management consistent  
- [ ] WebSocket logic isolated in hooks/services  

### ✅ **Security**
- [ ] JWT stored in memory  
- [ ] Admin-only routes protected  
- [ ] No sensitive data exposed  

### ✅ **Performance**
- [ ] Map updates throttled  
- [ ] WebSocket reconnection logic implemented  
- [ ] Large lists virtualized  

### ✅ **Code Quality**
- [ ] Strong typing  
- [ ] No `any` types  
- [ ] Clean separation of UI and logic  

### ✅ **Testing**
- [ ] Unit tests for services/hooks  
- [ ] Integration tests for login + alerts  
- [ ] WebSocket mocked  

---

# ✅ **SECTION C — Tester Acceptance Criteria (Copilot Tester)**

### ✅ **Login**
- [ ] Valid credentials → dashboard  
- [ ] Invalid credentials → error  

### ✅ **Alerts**
- [ ] Real-time alerts appear  
- [ ] Alert details load  
- [ ] Resolve action works  

### ✅ **Routes**
- [ ] Live map updates  
- [ ] History loads correctly  

### ✅ **Student Presence**
- [ ] Real-time boarding/alighting updates  

### ✅ **Video**
- [ ] Video list loads  
- [ ] Playback works  
- [ ] URL expires after configured time  

---

# ✅ **SECTION D — Future Enterprise Upgrade Path** (Optional)  

### ✅ **Advanced Analytics**
- Route efficiency  
- Driver performance  
- Safety metrics  

### ✅ **Incident Management Workflow**
- Notes  
- Attachments  
- Investigation timeline  

### ✅ **Multi‑tenant Support**
- Multiple school boards  
- Role-based access  

### ✅ **AI Insights**
- Predictive delays  
- Safety anomaly detection  

### ✅ **Compliance Tools**
- Audit logs  
- Data retention policies  
- Reporting exports  
