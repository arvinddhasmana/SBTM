# SBTM Alert Management — Design

- Document owner: Engineering and Architecture
- Status: **Draft for review** (feat/sbtm-refocus-data-model)
- Last reviewed: 2026-05-15
- Related: `DataModel-v2.md`, `Integrations-STA.md`, existing `services/emergency-alerts`, `services/notification-service`

## 1. Scope

Alerts in SBTM cover **four categories**:

| Category                  | Examples                                                                     | Origin                                          |
| ------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| **Operational**           | Route cancelled, bus delayed (>10 min), stop relocated, run substituted      | Board/School Admin, STA import, automated rules |
| **Safety / Emergency**    | Driver panic, accident, medical event                                        | Driver app, on-vehicle hardware                 |
| **Compliance / Tracking** | Route deviation > threshold, no-show after window, late departure from depot | `gps-tracking` service auto-detection           |
| **Informational**         | Weather advisory, schedule change next week, app maintenance                 | Admin manual                                    |

Phase 1 replaces the **STA cancellation/delay alert channel** (Operational + Informational) for participating boards/schools (per `stx_schools.alerts_enabled`). Safety/Emergency and Compliance flows already exist in `services/emergency-alerts`; this design unifies the schema and consumer model with those.

## 2. Design Principles

1. **One alert table, many subscriptions, many deliveries.** Avoid duplicating the same event across services.
2. **Audience derivation is explicit and reproducible.** Given an alert, we can deterministically compute and audit the recipient list.
3. **Idempotency end-to-end.** Re-firing an alert (e.g. webhook retry) does not double-send.
4. **Privacy-first.** A parent only ever sees alerts for runs/students they are authorised for — verified at delivery time, not just at subscription time.
5. **Channel-agnostic core.** Push, SMS, email, in-app are pluggable; `notification-service` already provides this and is reused.
6. **No silent failures.** Every alert has a delivery report; under-delivered alerts surface in admin consoles.

## 3. Data Model

### 3.1 `stx_alerts`

| field                        | type          | notes                                                                                                           |
| ---------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| id                           | uuid PK       |                                                                                                                 |
| category                     | enum          | `operational` \| `safety` \| `compliance` \| `informational`                                                    |
| event_type                   | text          | e.g. `route_cancelled`, `route_delayed`, `stop_relocated`, `weather_closure`, `driver_panic`, `route_deviation` |
| severity                     | enum          | `info` \| `notice` \| `warning` \| `critical`                                                                   |
| title                        | text          | localised at render time                                                                                        |
| body                         | text          | template key + params; see §6                                                                                   |
| scope_kind                   | enum          | `sta` \| `board` \| `school` \| `route` \| `run` \| `stop` \| `student`                                         |
| scope_id                     | uuid          | FK to the scope row                                                                                             |
| effective_from, effective_to | timestamptz   | window of validity                                                                                              |
| service_date                 | date          | school day this alert applies to                                                                                |
| source                       | enum          | `admin_manual` \| `sta_import` \| `sta_webhook` \| `auto_rule` \| `driver_app` \| `system`                      |
| source_ref                   | text          | upstream event id for idempotency                                                                               |
| created_by_user_id           | FK→users      | nullable for system                                                                                             |
| status                       | enum          | `draft` \| `published` \| `superseded` \| `cancelled`                                                           |
| supersedes_alert_id          | FK→stx_alerts | for "delay updated to 30 min" chains                                                                            |
| metadata                     | jsonb         | category-specific (e.g. `{ "delay_minutes": 25 }`)                                                              |

Unique constraint: `(source, source_ref)` to enforce idempotency.

### 3.2 `stx_alert_subscriptions`

| field                  | type        | notes                                                                                   |
| ---------------------- | ----------- | --------------------------------------------------------------------------------------- |
| id                     | uuid PK     |                                                                                         |
| user_id                | FK→users    |                                                                                         |
| scope_kind             | enum        | `sta` \| `board` \| `school` \| `route` \| `student`                                    |
| scope_id               | uuid        |                                                                                         |
| categories             | enum[]      | which categories user wants                                                             |
| channels               | enum[]      | `push` \| `sms` \| `email` \| `in_app`                                                  |
| quiet_hours            | jsonb       | `{ "start": "21:00", "end": "06:30", "tz": "America/Toronto" }`; ignored for `critical` |
| created_at, updated_at | timestamptz |                                                                                         |

**Default subscriptions** (auto-provisioned, modifiable):

- Parent: `student` scope for each of their `stx_students`, all categories, channels = `push` + `in_app`. Critical alerts always SMS-fall-through if a phone number is on file. **All listed guardians receive every alert** by default (no primary-only filtering for any category) — per session decision.
- School Admin: `school` scope, all categories.
- Board Admin: `board` scope, operational + safety + compliance.
- STA / Super Admin: `sta` scope, all.

**Unsubscribe lock**: parents **cannot** unsubscribe from `severity = 'critical'` alerts in the Safety/Emergency category. The UI hides the toggle for these; API enforces the same lock.

### 3.3 `stx_alert_deliveries`

| field                            | type        | notes                                                         |
| -------------------------------- | ----------- | ------------------------------------------------------------- |
| id                               | uuid PK     |                                                               |
| alert_id                         | FK          |                                                               |
| user_id                          | FK          |                                                               |
| channel                          | enum        |                                                               |
| status                           | enum        | `queued` \| `sent` \| `delivered` \| `failed` \| `suppressed` |
| suppression_reason               | text        | e.g. `quiet_hours`, `unauthorised_at_send_time`, `duplicate`  |
| provider_message_id              | text        | from notification-service                                     |
| sent_at, delivered_at, failed_at | timestamptz |                                                               |
| error                            | text        |                                                               |

> **Scope-context fields on the delivery row** (notification-service `notification_delivery_log`): `board_id` and `school_id` are both **nullable** and mirror the originating alert's `scope_kind`. Concretely: `scope_kind='sta'` → both null; `scope_kind='board'` → `board_id` set, `school_id` null; `scope_kind='school'` or `'route'` → `school_id` set, `board_id` null. The delivery row is therefore a lookup-friendly projection of scope — it is **not** an authorisation surface (RLS still enforces tenancy via the recipient's anchor). Same rule applies to `device_tokens`: the row no longer carries `school_id` at all, since a single device receives alerts at every scope its recipient is subscribed to (`stx_alert_subscriptions`).

### 3.4 `stx_alert_audit`

Standard audit row per state transition on `stx_alerts` (publish, supersede, cancel, edit).

## 4. End-to-End Pipeline

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐    ┌────────────────────┐    ┌─────────────────┐
│  Alert source   │ →  │  alert-service   │ →  │ audience-resolver  │ →  │ delivery-dispatch  │ →  │ notification-svc│
│ (admin/osta/... │    │  (writes alert)  │    │ (computes user list│    │ (per-channel queue)│    │ (push/sms/email)│
└─────────────────┘    └──────────────────┘    │  + auth filter)    │    └────────────────────┘    └─────────────────┘
                                ↓               └────────────────────┘              ↓
                       outbox / event bus                                 stx_alert_deliveries (per row)
```

**`alert-service`** (new service or extension of `emergency-alerts`):

1. Validates payload, generates alert UUID, inserts `stx_alerts` row in `draft`.
2. Optionally requires admin approval (configurable per category/severity).
3. On publish, writes to outbox; emits `alert.published` event.

**`audience-resolver`** (worker):

1. For each subscription whose `scope` covers the alert, list candidate users.
2. **Re-verify authorisation at send time** by joining `stx_ridership`, `stx_student_guardians`, role tables. A parent who unsubscribed a student that morning does not receive a 14:00 alert.
3. Apply `quiet_hours`, dedup against `(alert_id, user_id, channel)`.
4. Insert `stx_alert_deliveries` rows in `queued`.

**`delivery-dispatch`** (worker):

1. Pull queued rows by channel, hand off to `notification-service`.
2. Update statuses on callbacks/webhooks.
3. Retry `failed` rows with exponential backoff up to per-category cap.

## 5. Audience Resolution Rules (per scope_kind)

| Alert scope | Resolution                                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sta`       | All users in active subscriptions with STA scope, **plus cascade**: every board, school, route, run, stop, and parent under that STA on `service_date`. Used for STA-wide weather closures. |
| `board`     | Users with board subscription matching `scope_id`, plus all parents whose students attend a school in that board.                                                                           |
| `school`    | School subscribers + parents of students at that school.                                                                                                                                    |
| `route`     | Subscribers of that route + parents of students with active `stx_ridership` to a `trip` of that route on `service_date`.                                                                    |
| `run`       | Subscribers of the parent route + parents of students riding that specific run on `service_date`.                                                                                           |
| `stop`      | Parents of students whose ridership stop equals `scope_id` for that direction/date.                                                                                                         |
| `student`   | **All** guardians of that student (per session decision — no primary-only filtering by default).                                                                                            |

In all cases, **absent students** (per `stx_student_absences`) are excluded for that day's `route_delayed`/`route_cancelled`/`no_show`-type alerts unless the guardian has explicitly opted in.

## 6. Localisation

- Body templates are stored as keys in `libs/i18n` with `en` and `fr` strings (Ontario language requirement for OCSB/CECCE/CEPEO).
- Template params come from `stx_alerts.body` (JSON). Render at delivery time per recipient's `users.preferred_language`.
- Template inventory (Phase 1):
  - `route_cancelled`, `route_delayed`, `stop_relocated`, `run_substituted`, `weather_closure`, `bus_arriving_late`, `bus_no_show_window`, `driver_panic_acknowledged`, `route_deviation`, `student_boarded`, `student_alighted` (opt-in only — high-volume).

## 7. Trigger Specifications

### 7.1 Manual (admin)

Admin console form → `POST /alerts` with category, scope, schedule. Approval workflow per category.

### 7.2 STA import

File adapter parses `cancellations.csv` (Phase 1) or webhook (Phase 2). Each row becomes an alert with `source=sta_import|sta_webhook` and `source_ref=sta event id`. Re-imports are idempotent. STA-scope cancellations (e.g. weather closures) cascade per §5.

### 7.3 Auto-rule (compliance)

Existing `gps-tracking` `RouteDeviationEvent` and `RouteLifecycleEvent` (e.g. late departure) emit to the alert pipeline via the event bus. The alert is auto-published only if rule confidence ≥ threshold; otherwise queued for admin review.

### 7.4 Driver / on-vehicle

Existing `EmergencyAlert` flow remains; the entity is reshaped to write into `stx_alerts` (`category=safety`) with the same escalation chain (TIER_1 → TIER_2 → TIER_3, SCHOOL → BOARD → OSTA).

### 7.5 Weather / informational

Manual today. Phase 2 may auto-create from a weather feed; out of scope here.

## 8. Throttling & Storm Control

- A board-wide weather closure can fan-out to ~100k recipients. The dispatcher caps per-channel send rate via token-bucket (configurable per provider).
- Alert coalescing: if `route_delayed` for the same run is updated 3 times within 15 min, only the latest is sent; intermediates are marked `superseded`.
- Per-user cap: max 20 SMS/day to any one user; further alerts fall back to push/email.

## 9. Privacy & Audit

- Every delivery row has the resolved user_id and channel; full audit retained per `DataRetention.md`.
- **Retention is per-STA configurable** via `stx_sta.alert_retention_days` (default 730). Boarding-event retention is likewise per-STA (`boarding_event_retention_days`, default 395). Hard-purge runs nightly.
- A parent can request a "show me every alert about my child" report from the parent app — backed by `stx_alert_deliveries` joined on guardian-of-student.
- Alerts referencing a specific student must not name other students in the body (template lint at publish time).
- Test/preview sends are flagged `metadata.preview=true` and never count against analytics.

## 10. Existing Code Reuse / Replacement

| v1 entity                                       | v2 disposition                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `EmergencyAlert` (api-gateway-bound enums)      | becomes a row in `stx_alerts` with `category=safety`; existing escalation chain preserved as `metadata.escalation` |
| `AlertAuditLog`                                 | merged into `stx_alert_audit` (rename + extend)                                                                    |
| `AlertNotificationLog`                          | merged into `stx_alert_deliveries`                                                                                 |
| `NotificationPreference` (notification-service) | superset becomes `stx_alert_subscriptions`; existing rows migrated                                                 |
| `DeviceToken`                                   | unchanged; consumed by `delivery-dispatch`                                                                         |
| `RouteDeviationEvent` (gps-tracking)            | unchanged source; new event-bus consumer creates compliance alerts                                                 |

## 11. Testing & Observability

- Per-category synthetic alert each morning to a `qa@` recipient set; failure pages on-call.
- Metrics: alert publish-to-deliver p50/p95 per category, suppression rate, fallback rate, opt-out rate.
- Disaster drill: weather-closure simulation against a staging copy of the recipient set quarterly.

## 12. Resolved Decisions & Deferred Items

Per session direction (2026-05-15):

1. **Approval workflow** — Resolved: each STA decides for its own boards/schools. SBTM provides a configurable per-(category, severity) approval matrix on `stx_sta`; defaults are STA-permissive for `notice`/`info`, require STA approval for `warning`/`critical` weather closures.
2. **SMS provider** — Deferred: free tier in Phase 1 for testing; selection deferred.
3. **Parent self-service unsubscribe from `safety/critical`** — Resolved: **not permitted**. UI hides toggle; API enforces.
4. **Guardian quorum** — Resolved: **all listed guardians receive every alert** by default for every category. `is_primary_pickup` no longer filters delivery; it remains a flag for pickup authority only.
5. **SBTM/STA-app dual-send transition** — Deferred: per-school `stx_schools.alerts_enabled` enables co-existence. Concrete cutover policy deferred.
