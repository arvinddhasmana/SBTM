# UI Verification with Mock Data

This guide explains how to run the Admin Dashboard with mock data for rapid UI/UX verification without needing the full backend services or Docker environment.

## Quick Start

The quickest way to start the dashboard in mock mode is:

```bash
cd apps/admin-dashboard
npm run dev:mock
```

This will start the Vite dev server with the `VITE_USE_MOCK=true` environment variable enabled.

## Alternative Methods

If you want to trigger mock mode on an already running instance, you have two options:

### 1. URL Parameter (Foolproof)
Add `?mock=true` to the URL. For example:
`http://localhost:5173/login?mock=true`

This will automatically toggle mock mode and save it in your session.

### 2. Browser Console
Open the developer console (F12) and run:
```javascript
localStorage.setItem('VITE_USE_MOCK', 'true');
location.reload();
```

## How It Works

- **Mock API Service**: A central toggle in `apps/admin-dashboard/src/services/api/index.ts` intercepts all API calls.
- **Mock Implementation**: The `mockApi.ts` file contains realistic tactical data, including:
  - Active panic alerts.
  - Live GPS bus locations across Ottawa.
  - Real-time student boarding manifests.
  - Mission health status updates.
- **Auth Bypass**: Mock mode accepts any credentials (e.g., `admin@osta.ca` / `password`).

## Verification Console Log

When mock mode is active, you will see the following confirmation message in your browser's console:
`--- ADMIN DASHBOARD: MOCK MODE ACTIVE ---`
