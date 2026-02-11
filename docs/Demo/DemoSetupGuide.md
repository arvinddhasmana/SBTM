# SBTM Demo Setup Guide

## Prerequisites
- Node.js 20+
- Docker Desktop with Compose v2
- Git
- Optional: Expo Go on mobile devices (Driver App)

## Quick Start (Backend Services)
```powershell
# From repo root
cd c:\Src\SBTM_AntiGravity

# Start infrastructure and services
Docker compose up -d --build

# Check health endpoints
curl http://localhost:3001/api/v1/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/api/v1/health
```

## Frontend Apps (Local Dev)
### Admin Dashboard
```powershell
cd apps/admin-dashboard
npm install
npm run dev
```
- Default URL: http://localhost:5173
- For real API calls, set `VITE_API_URL` to `http://localhost:3001/api/v1`.
- Without API, the app uses mock data.

### Parent Portal (Web)
```powershell
cd apps/parent-app/web
npm install
npm run dev
```
- Default URL: http://localhost:5174 (if 5173 is in use)
- Uses mock login and simulated SSE data.

### Driver App (Expo)
```powershell
cd apps/driver-app
npm install
npx expo start
```
- Uses mock login (`driver@test.com` / `password`).
- Update `apps/driver-app/src/services/api.service.ts` to point at `http://<your-ip>:3001/api/v1` if you want live GPS and emergency events.

## Optional: Seed Demo Data
```powershell
# Windows
.\scripts\seed-demo-data.ps1

# macOS/Linux
./scripts/seed-demo-data.sh
```

## Service Ports
| Service | Port | Notes |
| --- | --- | --- |
| API Gateway | 3001 | `/api/v1` base prefix |
| GPS Tracking | 3002 | `/api/v1/locations` for ingest |
| Emergency Alerts | 3003 | `/api/v1/emergency-events` |
| Student Presence | 3004 | `/api/v1/presence-events` |
| Video Service | 3005 | `/api/v1/video-events` |
| Student Management | 3006 | `/students` CRUD |
| Compliance Management | 3007 | `/compliance`, `/inspections`, `/audit` |

## Demo Accounts
- Admin Dashboard: any credentials (mock fallback)
- Parent Portal: any credentials (mock)
- Driver App: `driver@test.com` / `password`

## Notes
- The admin dashboard and parent portal are demo-first and fall back to mock data when APIs are unavailable.
- Multi-tenant features are partially implemented in the API gateway but are not end-to-end enforced across all services.
