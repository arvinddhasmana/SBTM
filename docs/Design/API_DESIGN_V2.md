# 🔌 **API Design V2: Multi-Tenant REST Contracts**

## 1. General Pinciples
- **Base URL**: `/api/v2`
- **Authentication**: Bearer Token (JWT) in `Authorization` header.
- **Scope Enforcement**:
  - All endpoints infer `schoolId` from the JWT token for `SCHOOL_ADMIN`, `DRIVER`, `PARENT`.
  - `OSTA_ADMIN` may act on any school by passing `X-School-ID` header (impersonation/context).

## 2. Organization Management (OSTA Only)

### School Boards
- `GET /boards` - List all School Boards
- `POST /boards` - Create a new School Board
- `GET /boards/:id` - Get Board details
- `PUT /boards/:id` - Update Board details

### Schools
- `GET /boards/:boardId/schools` - List schools in a board
- `POST /boards/:boardId/schools` - Create a new School
- `GET /schools/:id` - Get School details
- `DELETE /schools/:id` - Deactivate a School

---

## 3. School Administration (School Admin)

### 3.1 Route Management
- `GET /schools/:schoolId/routes` - List all routes for the school
- `POST /schools/:schoolId/routes` - Create a new route
  - **Payload**: `{ name, direction: 'AM'|'PM', vehicleId }`
- `GET /routes/:id` - Get Route details with Stops
- `PUT /routes/:id` - Update Route (metadata, vehicle assignment)
- `POST /routes/:id/optimize` - Trigger AI Route Optimization
- `PUT /routes/:id/stops` - Update sequence of stops

### 3.2 Fleet Management
- `GET /schools/:schoolId/vehicles` - List all vehicles
- `POST /schools/:schoolId/vehicles` - Register a new vehicle
  - **Payload**: `{ licensePlate, capacity, status }`
- `PUT /vehicles/:id` - Update vehicle status
- `POST /vehicles/:id/maintenance` - Log maintenance event

### 3.3 Student Management
- `GET /schools/:schoolId/students` - List all students (paginated)
- `POST /schools/:schoolId/students` - Enroll a student
- `POST /schools/:schoolId/students/bulk-import` - Upload CSV for bulk enrollment
- `PUT /students/:id/assignment` - Assign student to Route/Stop
  - **Payload**: `{ amRouteId, amStopId, pmRouteId, pmStopId }`

---

## 4. Driver Operations (Mobile App)

### 4.1 Daily Workflow
- `GET /driver/me/schedule` - Get assigned routes for today
  - **Response**: `[ { routeId, name, direction, vehicleId, startTime } ]`
- `POST /driver/check-in` - Confirm bus assignment
  - **Payload**: `{ vehicleId, lat, lng }`
- `POST /driver/routes/:id/start` - Start the route
- `POST /driver/routes/:id/stops/:stopId/board` - Board a student
  - **Payload**: `{ studentId, method: 'NFC'|'MANUAL' }`
- `POST /driver/routes/:id/end` - Complete the route
  - **Payload**: `{ childCheckConfirmed: true }`

---

## 5. Parent Operations (Mobile App)

### 5.1 Child Tracking
- `GET /parent/children` - List all linked children
  - **Response**: `[ { studentId, name, schoolName, nextRoute: { eta, lat, lng } } ]`
- `POST /parent/children/:id/absence` - Report absence
  - **Payload**: `{ date, am: true, pm: true, reason }`

---

## 6. Error Handling (Standardized)

All endpoints return standard error responses:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND", // or "ACCESS_DENIED", "BUS_ALREADY_ASSIGNED"
    "message": "The requested route does not exist or belongs to another school.",
    "traceId": "abc-123"
  }
}
```
