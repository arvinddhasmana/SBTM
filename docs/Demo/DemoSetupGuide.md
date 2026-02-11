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
- Set `VITE_API_URL` to `http://localhost:3001` for API calls.

### Parent Portal (Web)
```powershell
cd apps/parent-app/web
npm install
npm run dev
```
- Default URL: http://localhost:5174 (if 5173 is in use)
- Set `VITE_API_URL` to `http://localhost:3001` for API calls.

### Driver App (Expo)
```powershell
cd apps/driver-app
npm install
npx expo start
```
- Set `EXPO_PUBLIC_API_URL` to point at `http://<your-ip>:3001/api/v1` for device testing.
- Android emulator default: `http://10.0.2.2:3001/api/v1`.

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
Seed demo users with `scripts/seed-demo-data.ps1` or `scripts/seed-demo-data.sh`.

Suggested demo accounts (password: `Admin123!`):
- Admin: `admin@sbtm.demo`
- Driver: `driver1@sbtm.demo`
- Parent: `parent1@sbtm.demo`

## Notes
- Multi-tenant features are enforced via `school_id` across services.
