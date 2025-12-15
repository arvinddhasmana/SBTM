# Cloud Backend - API Gateway Status

## Implemented
- [x] **Project Structure**: NestJS service initialized.
- [x] **Authentication**: JWT Strategy, Login, Me endpoints. Mocked user service.
- [x] **Gateway**: Proxies for GPS, Alerts, Presence, Video services.
- [x] **Security**: RBAC (RolesGuard), Rate Limiting (Throttler), Helmet.
- [x] **Logging & Error Handling**: Global Exception Filter, Logging Interceptor.

## Pending
- [ ] **Real User Store**: Connect to Database or Auth Service for real user validation.
- [ ] **Redis**: Connect Throttler to Redis (currently memory).

## Tests
- [ ] Unit Tests: Created but failing due to RxJS dependency conflicts (multiple versions).
- [ ] Integration Tests: Created but failing.
- [ ] Build: Failing due to RxJS type mismatch. Requires dependency deduplication.
