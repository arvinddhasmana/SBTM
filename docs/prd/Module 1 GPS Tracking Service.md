# Module 1: GPS Tracking Service

## Implementation Status
- **Service:** Node.js / Express / TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Validation:** Zod
- **Testing:** Jest + Supertest

## API Endpoints

### 1. Ingest Location
- **POST** `/api/v1/locations`
- **Body:**
  ```json
  {
    "vehicleId": "string",
    "routeId": "string",
    "timestamp": "ISO8601 string",
    "lat": number,
    "lng": number,
    "speedKph": number (optional),
    "headingDeg": number (optional),
    "accuracyMeters": number (optional)
  }
  ```

### 2. Get Live Location
- **GET** `/api/v1/routes/:routeId/live-location`
- **Response:**
  ```json
  {
    "vehicleId": "string",
    "routeId": "string",
    "lastUpdate": "ISO8601 string",
    "position": {
      "lat": number,
      "lng": number
    }
  }
  ```

### 3. Get Route History
- **GET** `/api/v1/routes/:routeId/history`
- **Response:** Array of location points.

## Setup
1.  Navigate to `services/gps-tracking`.
2.  Run `npm install`.
3.  Set `DATABASE_URL` in `.env`.
4.  Run `npx prisma generate` and `npx prisma migrate dev`.
5.  Run `npm run dev` to start the server.
