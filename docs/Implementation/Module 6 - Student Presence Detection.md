Absolutely, Arvind — here is the **complete GitHub‑ready template** for **Module 6 — Student Presence Detection**, written in the same structure and precision as Modules 1–5.  
This module is designed for **prototype hardware** (Apple AirTags, Samsung SmartTags, Bluetooth scanning via Driver App) while being fully upgradeable to **enterprise‑grade RFID/NFC readers** later.

You can paste this directly into a GitHub Issue and assign it to Copilot Developer, Reviewer, and Tester agents.

---

# ✅ **GITHUB ISSUE TEMPLATE — MODULE 6: Student Presence Detection**  
### *(Paste this into a GitHub Issue titled: “Module 6 — Student Presence Detection”)*

---

# 🎒 **Module 6 — Student Presence Detection (Prototype + Enterprise‑Ready)**  
**Goal:** Build a standalone Student Presence Detection Service that logs when students board or exit the bus using prototype hardware (Bluetooth SmartTags) and later supports enterprise RFID/NFC systems.

This module must be **independent**, **deployable on its own**, and integrate only through public APIs.

---

# ✅ **SECTION A — Developer Specification (Copilot Developer)**

## 1. **Tech Stack**
- **Backend Framework:** NestJS (TypeScript)  
- **Database:** PostgreSQL + TypeORM  
- **Queue:** Redis Streams or BullMQ  
- **Prototype Hardware:**  
  - Apple AirTag (BLE proximity)  
  - Samsung SmartTag (BLE proximity)  
  - Driver App acts as BLE scanner  
- **Enterprise Hardware (future):**  
  - RFID readers  
  - NFC student ID cards  
  - Bus-mounted scanners  

---

## 2. **Module Folder Structure**

Place under `/services/student-presence/`:

```
/services/student-presence
  /src
    /modules
      /presence
        presence.controller.ts
        presence.service.ts
        presence.repository.ts
        dto/
        entities/
      /tags
        tags.controller.ts
        tags.service.ts
        tags.repository.ts
        dto/
        entities/
      /realtime
        websocket.gateway.ts
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

### ✅ **1. Student Tag Registration**
- Parent or admin assigns a SmartTag ID to a student  
- Stored in DB  

### ✅ **2. BLE Scanning via Driver App**
- Driver App scans for BLE tags every 2–5 seconds  
- Sends detected tag IDs + signal strength to backend  

### ✅ **3. Presence Event Logging**
- Detect **BOARD** event when tag appears  
- Detect **ALIGHT** event when tag disappears for X seconds  
- Store presence events in DB  

### ✅ **4. Manual Override**
- Driver can manually mark student as boarded/alighted  

### ✅ **5. Admin Dashboard Integration**
- Admin can view:
  - Which students are on the bus  
  - Last seen timestamps  
  - Boarding/alighting history  

### ✅ **6. Real-time Updates**
- WebSocket push to Admin Dashboard  
- SSE fallback  

---

## 4. **APIs to Implement**

### ✅ **POST `/api/v1/student-tags`**  
Register a tag to a student.

**Request Body:**
```json
{
  "studentId": "stud-123",
  "tagId": "ble-xyz-789",
  "tagType": "SMARTTAG"
}
```

---

### ✅ **POST `/api/v1/presence-events`**  
Driver App sends BLE scan results.

**Request Body:**
```json
{
  "vehicleId": "bus-123",
  "routeId": "route-456",
  "timestamp": "2025-01-10T14:10:00Z",
  "detections": [
    { "tagId": "ble-xyz-789", "signalStrength": -60 }
  ]
}
```

**Response:**
```json
{ "status": "processed" }
```

---

### ✅ **GET `/api/v1/routes/{routeId}/students`**  
Returns current presence state.

**Response:**
```json
[
  {
    "studentId": "stud-123",
    "name": "John Doe",
    "status": "BOARDED",
    "lastSeen": "2025-01-10T14:12:00Z"
  }
]
```

---

### ✅ **POST `/api/v1/student-presence-events/manual`**  
Manual override.

---

### ✅ **WebSocket Channel: `/ws/presence`**
Pushes real-time boarding/alighting events.

---

## 5. **Data Models (TypeORM Entities)**

### ✅ `StudentTag`
```ts
id: string (UUID)
studentId: string
tagId: string
tagType: "SMARTTAG" | "RFID" | "NFC"
createdAt: Date
```

### ✅ `PresenceEvent`
```ts
id: string (UUID)
studentId: string
vehicleId: string
routeId: string
eventType: "BOARD" | "ALIGHT"
timestamp: Date
source: "SMARTTAG" | "MANUAL" | "RFID"
signalStrength?: number
```

### ✅ `StudentPresenceState`
(Not persisted; cached in Redis)

```ts
studentId: string
status: "BOARDED" | "ALIGHTED"
lastSeen: Date
vehicleId: string
routeId: string
```

---

## 6. **Core Logic Requirements**

### ✅ **BLE Detection Logic**
- If tag appears → BOARD event  
- If tag disappears for > X seconds → ALIGHT event  
- Use signal strength to avoid false positives  

### ✅ **Presence State Cache**
- Store current state in Redis  
- Update on each event  
- Expose via API  

### ✅ **Manual Override**
- Always overrides BLE logic  
- Logged with source = MANUAL  

### ✅ **Real-time Updates**
- WebSocket push to Admin Dashboard  
- SSE fallback  

---

## 7. **User Flows**

### ✅ **Flow 1: Parent Registers Tag**
1. Parent enters tag ID  
2. Backend links tag to student  
3. Driver App begins detecting tag  

---

### ✅ **Flow 2: Student Boards Bus**
1. Driver App detects tag  
2. Sends detection to backend  
3. Backend logs BOARD event  
4. Admin sees student as “On Bus”  

---

### ✅ **Flow 3: Student Leaves Bus**
1. Tag disappears for X seconds  
2. Backend logs ALIGHT event  
3. Admin sees student as “Off Bus”  

---

### ✅ **Flow 4: Manual Override**
1. Driver taps student in roster  
2. Sends manual event  
3. Backend updates state  

---

## 8. **Lifecycle Diagrams (Text Version)**

### ✅ **BLE Detection Lifecycle**
```
Driver App → BLE Scan → POST /presence-events → 
→ Presence Logic → DB Insert → Redis Cache Update → WebSocket Push
```

### ✅ **Manual Override Lifecycle**
```
Driver App → POST /manual → DB Insert → Cache Update → WebSocket Push
```

---

# ✅ **SECTION B — Reviewer Checklist (Copilot Reviewer)**

### ✅ **Architecture**
- [ ] BLE detection logic isolated in service  
- [ ] Repository pattern used  
- [ ] Cache layer abstracted  

### ✅ **Security**
- [ ] JWT required  
- [ ] Parents cannot access other students  
- [ ] No sensitive BLE IDs exposed publicly  

### ✅ **Performance**
- [ ] Presence events processed asynchronously  
- [ ] Redis used for fast state lookup  
- [ ] WebSocket events efficient  

### ✅ **Code Quality**
- [ ] Strong typing  
- [ ] DTO validation  
- [ ] Error handling middleware  

### ✅ **Testing**
- [ ] Mock BLE detection  
- [ ] Test BOARD/ALIGHT logic  
- [ ] Test manual override  

---

# ✅ **SECTION C — Tester Acceptance Criteria (Copilot Tester)**

### ✅ **Tag Registration**
- [ ] Valid tag registers successfully  
- [ ] Duplicate tag returns error  

### ✅ **BLE Detection**
- [ ] BOARD event logged when tag appears  
- [ ] ALIGHT event logged when tag disappears  
- [ ] Signal strength threshold respected  

### ✅ **Manual Override**
- [ ] Manual BOARD/ALIGHT works  
- [ ] Overrides BLE logic  

### ✅ **Real-time**
- [ ] Admin receives WebSocket updates  

### ✅ **Security**
- [ ] Unauthorized access returns 401  
- [ ] Parent cannot view other students  

---

# ✅ **SECTION D — Future Enterprise Upgrade Path**

### ✅ **Replace SmartTags with RFID/NFC**
- Bus-mounted readers  
- Student ID cards  
- Faster, more reliable detection  

### ✅ **Add multi-zone detection**
- Front door  
- Rear door  
- Seat-level sensors  

### ✅ **Add AI-based student counting**
- Camera-based detection  
- Cross-check with tag scans  

### ✅ **Add attendance integration**
- Sync with school SIS  
- Auto-mark attendance  

### ✅ **Add safety alerts**
- Student left on bus  
- Student missing at stop  
