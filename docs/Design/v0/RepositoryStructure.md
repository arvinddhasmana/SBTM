# Repository Structure (Current)

```
SBTM_AntiGravity/
  apps/
    admin-dashboard/      # React (Vite) web app
    driver-app/           # Expo (React Native)
    parent-app/
      web/                # React (Vite) web app
      mobile/             # Flutter scaffold (placeholder)
  services/
    api-gateway/          # NestJS API gateway + org/route/fleet modules
    gps-tracking/         # Express + Prisma GPS service
    emergency-alerts/     # NestJS alerts service
    student-presence/     # NestJS presence service
    video-service/        # NestJS video service
    student-management/   # NestJS student management service
    compliance-management/# NestJS compliance service
  docs/
    Business/
    Demo/
    Design/
    Implementation/
  infra/
    local/                # Local infra scripts
  scripts/                # Seed and demo scripts
```

## Notes
- `libs/` is present but not used yet.
