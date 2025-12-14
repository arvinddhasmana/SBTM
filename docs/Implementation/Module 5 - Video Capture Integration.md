This module is **independent**, **self‑contained**, and designed to work with **low‑cost prototype hardware** (smartphone camera, dashcam) while being fully upgradeable to **enterprise‑grade multi‑camera DVR systems** later.

---

# 🎥 **Module 5 — Video Capture Integration (Prototype + Enterprise‑Ready)**  
**Goal:** Build a standalone Video Capture Service that allows the Driver App to record short video clips during emergencies or incidents, upload them securely, store metadata, and expose APIs for Admins to view and manage video events.

This module must be **independent**, **deployable on its own**, and integrate only through public APIs.
- Use docker for containerization of all services and components
- Use docker compose for local development and testing
- Use docker compose for CI/CD pipeline
---

# ✅ **SECTION A — Developer Specification (Copilot Developer)**

## 1. **Tech Stack**
- **Backend Framework:** NestJS (TypeScript)  
- **Database:** PostgreSQL + TypeORM  
- **Object Storage:**  
  - Prototype: Local storage or MinIO (S3‑compatible)  
  - Enterprise: AWS S3 / Azure Blob / GCP Storage  
- **Queue:** Redis Streams or BullMQ  
- **Video Input Sources:**  
  - Smartphone camera (Driver App)  
  - Dashcam (manual upload or Wi‑Fi sync)  
  - Future: Enterprise DVR systems  

---

## 2. **Module Folder Structure**

Place under `/services/video-service/`:

```
/services/video-service
  /src
    /modules
      /video-events
        video-events.controller.ts
        video-events.service.ts
        video-events.repository.ts
        dto/
        entities/
      /upload
        upload.controller.ts
        upload.service.ts
      /storage
        storage.service.ts
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

### ✅ **1. Video Event Creation**
Triggered by:
- Emergency Alerts (Module 4)  
- Manual recording from Driver App  
- Dashcam upload  

### ✅ **2. Video Upload**
- Generate pre‑signed upload URL  
- Accept video file (MP4 recommended)  
- Store in object storage  
- Save metadata in DB  

### ✅ **3. Video Metadata Storage**
Store:
- Route  
- Vehicle  
- Driver  
- Timestamp  
- Duration  
- Event type  
- Video URL  
- Thumbnail URL (optional)  

### ✅ **4. Admin Video Viewer**
- List video events  
- View metadata  
- Securely stream video  

### ✅ **5. Access Control**
- Admins: full access  
- Parents: no access (unless future policy changes)  
- Drivers: access only to their own recordings (optional)  

---

## 4. **APIs to Implement**

### ✅ **POST `/api/v1/video-events`**  
Register a new video event.

**Request Body:**
```json
{
  "vehicleId": "bus-123",
  "routeId": "route-456",
  "driverId": "driver-789",
  "timestamp": "2025-01-10T14:25:10Z",
  "eventType": "EMERGENCY",
  "durationSeconds": 20
}
```

**Response:**
```json
{
  "videoEventId": "vid-001",
  "uploadUrl": "https://storage.example.com/presigned-url",
  "thumbnailUploadUrl": "https://storage.example.com/presigned-thumb"
}
```

---

### ✅ **POST `/api/v1/video-events/{id}/complete`**  
Called after upload finishes.

**Request Body:**
```json
{
  "videoUrl": "https://storage.example.com/video/vid-001.mp4",
  "thumbnailUrl": "https://storage.example.com/thumb/vid-001.jpg"
}
```

---

### ✅ **GET `/api/v1/video-events`**  
Admin fetches list of video events.

---

### ✅ **GET `/api/v1/video-events/{id}`**  
Admin fetches metadata + secure playback URL.

---

### ✅ **WebSocket Channel: `/ws/video-events`**  
Pushes new video events to Admin Dashboard.

---

## 5. **Data Models (TypeORM Entities)**

### ✅ `VideoEvent`
```ts
id: string (UUID)
vehicleId: string
routeId: string
driverId: string
timestamp: Date
eventType: "EMERGENCY" | "INCIDENT" | "MANUAL"
durationSeconds: number
videoUrl: string
thumbnailUrl?: string
status: "UPLOADING" | "READY" | "FAILED"
createdAt: Date
updatedAt: Date
```

### ✅ `VideoAccessLog`
```ts
id: string (UUID)
videoEventId: string
userId: string
timestamp: Date
ipAddress: string
```

---

## 6. **Core Logic Requirements**

### ✅ **Video Event Lifecycle**
1. Driver triggers event  
2. Service creates DB entry  
3. Generates pre‑signed upload URL  
4. Driver uploads video  
5. Service marks event as READY  
6. Admin notified via WebSocket  

---

### ✅ **Storage Service**
- Prototype: MinIO or local folder  
- Enterprise: S3/Blob/GCS  
- Must support:
  - Pre‑signed upload  
  - Pre‑signed download  
  - Expiring URLs  

---

### ✅ **Security**
- Videos must **never** be publicly accessible  
- All access logged  
- URLs expire within minutes  

---

## 7. **User Flows**

### ✅ **Flow 1: Driver Records Video**
1. Driver App records 10–20 sec clip  
2. Calls `POST /video-events`  
3. Receives upload URL  
4. Uploads video  
5. Calls `/complete`  
6. Admin notified  

---

### ✅ **Flow 2: Dashcam Upload**
1. Dashcam syncs via Wi‑Fi or manual SD card upload  
2. Admin uploads via Admin Dashboard  
3. Service stores metadata  

---

### ✅ **Flow 3: Admin Views Video**
1. Admin opens video list  
2. Selects event  
3. Service returns secure playback URL  
4. Admin streams video  

---

## 8. **Lifecycle Diagrams (Text Version)**

### ✅ **Video Capture Lifecycle**
```
Driver App → Record Video → POST /video-events → Pre-signed URL → Upload → 
→ POST /complete → DB Update → WebSocket Push → Admin Views Video
```

### ✅ **Dashcam Lifecycle**
```
Dashcam → Local File → Admin Upload → Storage → Metadata → Admin Playback
```

---

# ✅ **SECTION B — Reviewer Checklist (Copilot Reviewer)**

### ✅ **Architecture**
- [ ] Controllers thin, logic in services  
- [ ] Storage service abstracted (MinIO/S3 interchangeable)  
- [ ] Queue used for async tasks (thumbnail generation optional)  

### ✅ **Security**
- [ ] Pre‑signed URLs expire  
- [ ] No public video URLs  
- [ ] Access logged  
- [ ] JWT required for all endpoints  

### ✅ **Performance**
- [ ] Upload endpoints non‑blocking  
- [ ] Video metadata queries indexed  
- [ ] WebSocket events efficient  

### ✅ **Code Quality**
- [ ] Strong typing  
- [ ] DTO validation  
- [ ] Error handling middleware  

### ✅ **Testing**
- [ ] Mock storage provider  
- [ ] Test upload → complete flow  
- [ ] Test access control  

---

# ✅ **SECTION C — Tester Acceptance Criteria (Copilot Tester)**

### ✅ **Video Event Creation**
- [ ] Valid request returns upload URL  
- [ ] Invalid payload returns 400  

### ✅ **Upload Flow**
- [ ] Upload URL accepts file  
- [ ] `/complete` marks event READY  
- [ ] Admin sees event in list  

### ✅ **Playback**
- [ ] Admin receives secure playback URL  
- [ ] URL expires after configured time  

### ✅ **Real-time**
- [ ] WebSocket pushes new video event  

### ✅ **Security**
- [ ] Unauthorized access returns 401  
- [ ] Parent cannot access videos  

---

# ✅ **SECTION D — Future Enterprise Upgrade Path** (Optional)  

### ✅ **Integrate with multi-camera DVR systems**
- Interior + exterior cameras  
- Stop-arm cameras  
- Automatic upload  

### ✅ **AI Video Analysis**
- Fight detection  
- Vandalism detection  
- Driver behavior analysis  

### ✅ **Continuous Recording**
- 24/7 loop recording  
- Event-based clip extraction  

### ✅ **Encrypted Onboard Storage**
- Tamper-proof DVR  
- Secure offload  

### ✅ **Retention Policies**
- Auto-delete after 30–90 days  
- Legal hold support  
