Here it is, Arvind — the **complete GitHub‑ready template** for **Module 4 — Emergency Alerts**, written in the same structure and precision as Modules 1–3.  
You can paste this directly into a GitHub Issue and assign it to Copilot Developer, Reviewer, and Tester agents.

This module is **independent**, **self‑contained**, and integrates with the GPS Tracking Service, Driver App, Parent App, and Admin Dashboard.

---

# ✅ **GITHUB ISSUE TEMPLATE — MODULE 4: Emergency Alerts Service**  
### *(Paste this into a GitHub Issue titled: “Module 4 — Emergency Alerts Service”)*

---

# 🚨 **Module 4 — Emergency Alerts Service**  
**Goal:** Build a standalone Emergency Alerts Service that receives emergency events from the Driver App, logs them, triggers notifications, and exposes APIs for Admin and Parent apps to view and respond to alerts.

This module must be **independent**, **deployable on its own**, and integrate only through public APIs.

---

# ✅ **SECTION A — Developer Specification (Copilot Developer)**

## 1. **Tech Stack**
- **Backend Framework:** NestJS (TypeScript)  
- **Database:** PostgreSQL + TypeORM  
- **Queue:** Redis Streams or BullMQ (lightweight, free)  
- **Notifications:**  
  - FCM (mobile push)  
  - OneSignal/Courier (multi-channel abstraction)  
- **Real-time:**  
  - WebSockets for Admin Dashboard  
  - SSE fallback  

---

## 2. **Module Folder Structure**

Place under `/services/emergency-alerts/`:

```
/services/emergency-alerts
  /src
    /modules
      /alerts
        alerts.controller.ts
        alerts.service.ts
        alerts.repository.ts
        dto/
        entities/
      /notifications
        notifications.service.ts
      /realtime
        websocket.gateway.ts
        sse.controller.ts
    /config
      ormconfig.ts
      env.ts
    /tests
      /unit
      /integration
  Dockerfile
  package.json
  README.md
```

---

## 3. **Features to Implement (MVP)**

### ✅ **1. Receive Emergency Events**
Triggered by Driver App panic button.

### ✅ **2. Log Emergency Event**
Store in DB with:
- Timestamp  
- Route  
- Vehicle  
- Driver  
- GPS location (optional)  
- Event type  

### ✅ **3. Notify Admins**
- Real-time WebSocket push  
- SSE fallback  

### ✅ **4. Notify Parents**
- Push notification via FCM  
- Only for students assigned to that route  

### ✅ **5. Expose APIs**
- Admin: list active alerts  
- Admin: view alert details  
- Parent: view alert summary (limited fields)  

---

## 4. **APIs to Implement**

### ✅ **POST `/api/v1/emergency-events`**  
Driver triggers emergency.

**Request Body:**
```json
{
  "vehicleId": "bus-123",
  "routeId": "route-456",
  "driverId": "driver-789",
  "timestamp": "2025-01-10T14:25:10Z",
  "lat": 45.4215,
  "lng": -75.6972,
  "eventType": "PANIC_BUTTON"
}
```

**Response:**
```json
{ "status": "received", "alertId": "alert-001" }
```

---

### ✅ **GET `/api/v1/alerts/active`**  
Admin fetches active alerts.

**Response:**
```json
[
  {
    "alertId": "alert-001",
    "routeId": "route-456",
    "vehicleId": "bus-123",
    "timestamp": "2025-01-10T14:25:10Z",
    "eventType": "PANIC_BUTTON",
    "status": "ACTIVE"
  }
]
```

---

### ✅ **GET `/api/v1/alerts/{alertId}`**  
Admin fetches alert details.

---

### ✅ **GET `/api/v1/alerts/parent-view/{routeId}`**  
Parent fetches limited alert info.

**Response:**
```json
{
  "routeId": "route-456",
  "alertActive": true,
  "message": "Emergency reported on your child’s bus."
}
```

---

### ✅ **WebSocket Channel: `/ws/alerts`**
Pushes real-time alerts to Admin Dashboard.

---

### ✅ **SSE Endpoint: `/api/v1/alerts/stream`**
Fallback for real-time admin updates.

---

## 5. **Data Models (TypeORM Entities)**

### ✅ `EmergencyAlert`
```ts
id: string (UUID)
vehicleId: string
routeId: string
driverId: string
timestamp: Date
lat: number
lng: number
eventType: "PANIC_BUTTON" | "INCIDENT" | "OTHER"
status: "ACTIVE" | "RESOLVED"
createdAt: Date
updatedAt: Date
```

### ✅ `AlertNotificationLog`
```ts
id: string (UUID)
alertId: string
recipientUserId: string
channel: "PUSH" | "EMAIL" | "SMS"
status: "SENT" | "FAILED"
timestamp: Date
```

---

## 6. **Core Logic Requirements**

### ✅ **Emergency Event Handling**
1. Validate request  
2. Save alert to DB  
3. Publish event to Redis queue  
4. Notify Admins (WebSocket/SSE)  
5. Notify Parents (FCM)  

---

### ✅ **Admin Real-time Updates**
- WebSocket gateway broadcasts new alerts  
- SSE fallback for browsers without WS  

---

### ✅ **Parent Notifications**
- Identify students assigned to route  
- Send push notification  
- Log notification status  

---

### ✅ **Alert Resolution**
- Admin can mark alert as resolved  
- Notify parents if needed  

---

## 7. **User Flows**

### ✅ **Flow 1: Driver Panic Button**
1. Driver taps panic  
2. Driver App sends POST `/emergency-events`  
3. Emergency Alerts Service logs event  
4. Admin Dashboard receives real-time alert  
5. Parents receive push notification  

---

### ✅ **Flow 2: Admin Responds**
1. Admin opens alert  
2. Views details (location, timestamp, driver)  
3. Marks alert as resolved  
4. Parents receive “resolved” notification (optional)  

---

### ✅ **Flow 3: Parent Notification**
1. Parent receives push  
2. Opens Parent App  
3. Sees alert summary  

---

## 8. **Lifecycle Diagrams (Text Version)**

### ✅ **Emergency Event Lifecycle**
```
Driver App → POST /emergency-events → DB Insert → Redis Queue → 
→ Admin WebSocket Push → Parent Push Notification → Alert Monitoring
```

### ✅ **Alert Resolution Lifecycle**
```
Admin → PATCH /alerts/{id}/resolve → DB Update → Notify Parents → Archive
```

---

# ✅ **SECTION B — Reviewer Checklist (Copilot Reviewer)**

### ✅ **Architecture**
- [ ] Controllers thin, logic in services  
- [ ] Repository pattern used  
- [ ] WebSocket gateway isolated from business logic  

### ✅ **Security**
- [ ] JWT required for all endpoints  
- [ ] Role-based access (Driver/Admin/Parent)  
- [ ] No sensitive data exposed to parents  

### ✅ **Performance**
- [ ] WebSocket broadcasts efficient  
- [ ] Redis queue used for async tasks  
- [ ] No blocking operations  

### ✅ **Code Quality**
- [ ] Strong typing  
- [ ] DTO validation  
- [ ] Error handling middleware  

### ✅ **Testing**
- [ ] Unit tests for alert creation  
- [ ] Integration tests for WebSocket events  
- [ ] Notification service mocked  

---

# ✅ **SECTION C — Tester Acceptance Criteria (Copilot Tester)**

### ✅ **Emergency Event**
- [ ] Valid event returns 200  
- [ ] Invalid payload returns 400  
- [ ] Alert appears in admin list  

### ✅ **Real-time Updates**
- [ ] Admin receives WebSocket alert  
- [ ] SSE fallback works  

### ✅ **Parent Notifications**
- [ ] Parent receives push  
- [ ] Parent sees alert summary  

### ✅ **Alert Resolution**
- [ ] Admin can resolve alert  
- [ ] Status updates in DB  
- [ ] Parent receives resolution notification (if enabled)  

---

# ✅ **SECTION D — Future Enterprise Upgrade Path**

### ✅ **Integrate with telematics hardware**
- Panic button wired to telematics unit  
- Automatic video capture  

### ✅ **Add severity levels**
- Low, Medium, High  

### ✅ **Add automated escalation**
- Notify school board  
- Notify emergency services  

### ✅ **Add incident workflow**
- Admin notes  
- Attachments  
- Investigation logs  

### ✅ **Add geo-fence-based auto-alerts**
- Bus off-route  
- Bus stopped too long  
