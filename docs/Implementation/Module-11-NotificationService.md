# Module 11 - Notification Service

- Last reviewed: 2026-04-03

## Status

Implemented as part of Phase A (Parent Safety Communication). Channel adapters run in dry-run mode until production provider credentials are configured.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/v4/GapAnalysis.md` (GAP-ALERT-002, GAP-ALERT-004, GAP-ALERT-005, GAP-ROLE-006)
- Planned delivery phase: `docs/prd/v4/UpgradePlan.md` Phase A

## Location

- `services/notification-service`

## Runtime

- **Port**: 3008
- **Health check**: `GET /health`
- **BullMQ queue**: `notifications` (concurrency 5, 3 retries, exponential backoff 1s)

## Tech Stack

- NestJS v11 + TypeORM + PostgreSQL
- `@nestjs/bullmq` + Redis (BullMQ job processing)
- `firebase-admin` (FCM push notifications)
- `nodemailer` (SMTP email)
- `twilio` (SMS delivery)
- `nestjs-pino` (structured logging)
- `@sbtm/common` (shared auth guards, tracing)

## Architecture

The Notification Service consumes `notification-request` jobs from the BullMQ `notifications` queue. Jobs are published by:

- **Student Presence Service**: on BOARD/ALIGHT events
- **Emergency Alerts Service**: on EMERGENCY events

### Processing Flow

1. `NotificationProcessor` receives job, validates required fields
2. `NotificationRouterService` determines enabled channels from `PreferencesService`
3. For each enabled channel, the router:
   - **PUSH**: Fetches device tokens -> `FcmAdapter.send()` -> deactivates invalid tokens
   - **EMAIL**: Fetches user email from DB -> `EmailAdapter.send()`
   - **SMS**: Fetches user phone from DB -> `SmsAdapter.send()`
4. Each delivery attempt is logged in `notification_delivery_log`
5. For EMERGENCY: if PUSH fails and SMS not already attempted, auto-escalates to SMS

### Privacy

- Only entity IDs are stored in BullMQ job payloads
- Contact info (email, phone, FCM tokens) is fetched from DB at processing time
- No PII is cached in Redis or logged

## Database Tables

| Table                       | Purpose                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `device_tokens`             | FCM registration tokens per user/device. UNIQUE(userId, token)         |
| `notification_preferences`  | Parent opt-in/out per event type and channel. EMERGENCY always enabled |
| `notification_delivery_log` | Unified delivery audit trail with status tracking                      |

## API Endpoints

All endpoints are guarded by `InternalServiceAuthGuard` and proxied through the API Gateway with `@Roles(Role.PARENT)`.

| Method | Path                               | Description                                       |
| ------ | ---------------------------------- | ------------------------------------------------- |
| GET    | `/api/v1/notification-preferences` | Get user's notification preferences               |
| PUT    | `/api/v1/notification-preferences` | Update preferences (EMERGENCY cannot be disabled) |
| POST   | `/api/v1/device-tokens`            | Register a device token                           |
| DELETE | `/api/v1/device-tokens/:id`        | Deactivate a device token                         |
| GET    | `/api/v1/device-tokens`            | List user's device tokens                         |
| GET    | `/api/v1/delivery-log`             | Query delivery log for user                       |

## Configuration

| Environment Variable                                              | Purpose                               | Default |
| ----------------------------------------------------------------- | ------------------------------------- | ------- |
| `PORT`                                                            | Service port                          | 3008    |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL connection                 | -       |
| `REDIS_HOST`, `REDIS_PORT`                                        | Redis/BullMQ connection               | -       |
| `FCM_DRY_RUN`                                                     | Skip actual FCM sends                 | `true`  |
| `FCM_SERVICE_ACCOUNT_PATH`                                        | Path to Firebase service account JSON | -       |
| `EMAIL_DRY_RUN`                                                   | Skip actual email sends               | `true`  |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`   | SMTP configuration                    | -       |
| `SMS_DRY_RUN`                                                     | Skip actual SMS sends                 | `true`  |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`   | Twilio configuration                  | -       |

## Test Coverage

30 unit tests across 8 spec files:

- `tokens.service.spec.ts` (5 tests)
- `preferences.service.spec.ts` (6 tests)
- `delivery-log.service.spec.ts` (3 tests)
- `fcm.adapter.spec.ts` (2 tests)
- `email.adapter.spec.ts` (1 test)
- `sms.adapter.spec.ts` (1 test)
- `notification.processor.spec.ts` (4 tests)
- `notification-router.service.spec.ts` (8 tests)

## Modified Upstream Services

### Student Presence Service

- `presence.processor.ts`: Publishes `notification-request` jobs to `notifications` queue after persisting presence events
- Status changed from `SENT` to `PENDING` (delivery now handled by notification-service)

### Emergency Alerts Service

- `alerts.processor.ts`: For each parent on a route, publishes `notification-request` job with `eventType='EMERGENCY'`
- Status changed from `SENT` to `PENDING`

### API Gateway

- New `NotificationSettingsController` proxies preference and device token endpoints to notification-service
- New `NotificationSettingsGatewayService` handles HTTP calls to notification-service

### Parent App (Web)

- Settings page: Notification preference toggles (BOARD/ALIGHT toggleable, EMERGENCY locked)
- API client: `getNotificationPreferences()`, `updateNotificationPreferences()`, `registerDeviceToken()`
- Layout: Settings nav link in desktop and mobile menus
