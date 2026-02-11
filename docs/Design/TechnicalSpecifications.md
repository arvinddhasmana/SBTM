# SBTM Technical Specifications (Current)

## Technology Stack
- Frontend: React 19 (Vite), TailwindCSS, Leaflet.
- Mobile: React Native (Expo).
- API Gateway: NestJS, TypeORM, JWT, RBAC.
- Services: NestJS (alerts, presence, video, student, compliance), Express (GPS).
- Data: PostgreSQL (PostGIS enabled), Redis, MinIO/local object storage.

## Prototype Hardware Assumptions
- GPS via smartphone sensors.
- Panic button via in-app UI.
- Student detection via BLE SmartTags (service implemented, app integration pending).
- Video events uploaded from phone or dashcam.

## Security
- JWT auth and role checks in the API gateway.
- Service-to-service auth is not implemented yet.
- No centralized audit pipeline outside the compliance service.

## Multi-Tenant Notes
- Boards, schools, routes, and vehicles exist in the API gateway DB.
- Downstream services do not enforce tenant isolation.
- UI does not yet expose board/school management.
