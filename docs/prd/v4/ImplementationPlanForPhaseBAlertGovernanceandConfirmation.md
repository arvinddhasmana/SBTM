## Plan: Phase B — Alert Governance and Confirmation

> **Historical record (pre-v2 cutover).** This plan references v1 endpoints, the `EmergencyAlert` entity, and the `OSTA_ADMIN` role — all replaced by `stx_alerts` + `STA_ADMIN` in v2 (`docs/Design/Alerts.md`, `docs/Design/DataModel-v2.md` §10). Kept for product-history context; not a current implementation reference.

Implement alert tier classification (Tier 1/2/3), admin confirmation workflow with auto-escalation, escalation chain (School → Board → OSTA), operational alerts dashboard, and full audit trail. This transforms the current simple ACTIVE/RESOLVED alert lifecycle into a governed process where Tier 1 safety alerts require School Admin confirmation before parent delivery, with timeout-based auto-escalation.

---

### **Steps**

#### Phase 1: Database Schema & Enums (Foundation — all others depend on this)

1. Add new PostgreSQL enums to init-db.sql: `alert_tier_enum` (TIER_1/2/3), `alert_confirmation_action_enum` (CONFIRMED, FALSE_ALARM, REQUEST_INFO, AUTO_ESCALATED), `alert_escalation_level_enum` (SCHOOL, BOARD, OSTA, PARENT). Extend `emergency_alert_status_enum` with PENDING_CONFIRMATION, CONFIRMED, FALSE_ALARM, ESCALATED. Add new event types: MEDICAL, LATE_DEPARTURE, COMPLIANCE_EXPIRING, COMPLIANCE_EXPIRED, INSPECTION_FAILED, VEHICLE_MAINTENANCE.

2. Alter `emergency_alert` table — add columns: `tier`, `confirmationRequired`, `confirmationDeadlineAt`, `confirmedByUserId`, `confirmedAt`, `confirmationAction`, `confirmationNotes`, `escalationLevel`, `escalatedAt`, `parentNotifiedAt`.

3. Create new `alert_event_log` table for audit trail — columns: id, alertId, eventType (CREATED/CONFIRMED/FALSE_ALARM/AUTO_ESCALATED/NOTIFIED_PARENTS/ESCALATED_BOARD/ESCALATED_OSTA/RESOLVED/REOPENED), actorUserId, actorRole, notes, escalationLevel, metadata (JSONB), createdAt.

#### Phase 2: Alert Classifier (B.1) — _parallel with Phase 4_

4. Create `AlertClassifier` class in `services/emergency-alerts/src/modules/alerts/alert-classifier.ts` with `classify(eventType)` method mapping: PANIC*BUTTON/MEDICAL/INCIDENT/PANIC_ALERT → TIER_1 (confirmationRequired: true); LATE_DEPARTURE/LATE_ARRIVAL/ROUTE_DIVERSION/COMPLIANCE*\*/INSPECTION_FAILED/VEHICLE_MAINTENANCE → TIER_2 (confirmation: false); ROUTE_DEVIATION → context-dependent classification.

5. Update `EmergencyEventType` enum, add `AlertTier`/`ConfirmationAction`/`EscalationLevel` enums, and add new columns to `EmergencyAlert` entity in emergency-alert.entity.ts.

6. Integrate classifier into `AlertsService.create()` — auto-classify on alert creation, set tier and confirmationRequired before save.

#### Phase 3: Confirmation Engine & Escalation Chain (B.2, B.4) — _depends on Phase 2_

7. Create `ConfirmationEngineService` in `services/emergency-alerts/src/modules/alerts/confirmation-engine.service.ts`:
   - For Tier 1: set status=PENDING_CONFIRMATION, schedule BullMQ delayed job at 2-min timeout, notify School Admin via WebSocket+push
   - `confirm(alertId, userId, notes)` → status=CONFIRMED, trigger parent notification
   - `markFalseAlarm(alertId, userId, notes)` → status=FALSE_ALARM, no parent notification
   - `requestMoreInfo(alertId, userId, notes)` → extend deadline +2 min, reschedule timeout

8. Create `EscalationProcessor` (BullMQ) in `services/emergency-alerts/src/modules/alerts/escalation.processor.ts` — queue `'alert-escalation'` with jobs: `confirmation-timeout` (2 min → auto-escalate to parents), `escalate-board` (5 min → Board Admin), `escalate-osta` (15 min → OSTA Admin), `critical-unresolved` (30 min → audit log).

9. Register `'alert-escalation'` queue and new providers in alerts.module.ts.

10. Update `AlertsProcessor.process()` in alerts.processor.ts — Tier 1: route through confirmation engine (no immediate parent fan-out); Tier 2: admin-only delivery; Tier 3: immediate parent delivery (bypass confirmation).

#### Phase 4: Audit Trail (B.6) — _parallel with Phase 2_

11. Create `AlertEventLog` entity in `services/emergency-alerts/src/modules/alerts/entities/alert-event-log.entity.ts`.

12. Create `AuditTrailService` in `services/emergency-alerts/src/modules/alerts/audit-trail.service.ts` with `log(alertId, eventType, actorUserId, actorRole, notes?, escalationLevel?, metadata?)`.

13. Integrate audit calls at all state transitions: creation, confirmation, false alarm, auto-escalation, parent notification, board/OSTA escalation, resolution.

14. Add `GET /alerts/:alertId/audit-trail` endpoint to alerts.controller.ts.

#### Phase 5: API Gateway Updates — _depends on Phase 3_

15. Add new proxy endpoints in alerts.controller.ts: `POST /alerts/:id/confirm`, `POST /alerts/:id/false-alarm`, `POST /alerts/:id/request-info`, `GET /alerts/:id/audit-trail`, `GET /alerts/operational` — all RBAC-gated to SCHOOL_ADMIN/BOARD_ADMIN/OSTA_ADMIN.

16. Update alerts.gateway.service.ts to proxy new endpoints.

#### Phase 6: Admin Confirmation UI (B.3) — _depends on Phase 5, parallel with Phase 7_

17. Create `AlertConfirmationModal` component in `apps/admin-dashboard/src/components/alerts/AlertConfirmationModal.tsx` — shows alert details, countdown timer, and actions: "Confirm & Notify Parents", "Mark as False Alarm" (with notes), "Request More Information".

18. Update AlertDetail.tsx — for PENDING_CONFIRMATION alerts, show confirmation actions instead of "Mark as Resolved".

19. Update AlertCard.tsx — add tier badge (red/amber/blue), pulsing indicator for pending confirmation, countdown display.

20. Add new API methods in alerts.api.ts: `confirmAlert()`, `markFalseAlarm()`, `requestMoreInfo()`, `getAuditTrail()`, `getOperationalAlerts()`.

21. Update mock data and handlers in alerts.data.ts and alerts.mock.ts.

#### Phase 7: Operational Alerts Dashboard (B.5) — _parallel with Phase 6_

22. Create `OperationalAlerts` page in `apps/admin-dashboard/src/pages/OperationalAlerts.tsx` — shows Tier 2 alerts only, filterable by type/date/school, admin-only.

23. Add `/alerts/operational` route in App.tsx and nav item in Sidebar.tsx.

24. Update Alerts.tsx — add tier filter tabs: "Safety (Tier 1)" / "Operational (Tier 2)" / "All".

#### Phase 8: Parent App Updates — _depends on Phase 3_

25. Update `ActiveAlert` type in api.ts and types/index.ts to include tier and confirmation status fields. No major UI changes — parents only receive alerts post-confirmation or post-timeout.

#### Phase 9: Testing — _depends on all above_

26. Write unit tests: `alert-classifier.spec.ts`, `confirmation-engine.service.spec.ts`, `escalation.processor.spec.ts`, `audit-trail.service.spec.ts`. Update existing `alerts.service.spec.ts` and `alerts.processor.spec.ts`.

27. E2E test scenarios: Tier 1 confirm → parents notified; Tier 1 timeout → auto-escalate; false alarm → no parent notification; Tier 2 → admin-only; escalation chain timing; audit trail completeness.

#### Phase 10: Documentation & Scripts — _depends on Phase 9_

28. Update database docs: DatabaseSchema.md, DataArchitecture.md
29. Update architecture docs: Architecture.md, SystemArchitecture.md, EventCatalog.md, IntegrationArchitecture.md
30. Update demo docs: DEMO_SETUP_GUIDE.md, LiveDemoScript.md, QUICK_REFERENCE.md — add alert governance demo scene
31. Update user guides: school-operator/README.md, parent/README.md
32. Update operations docs: Runbooks.md, Troubleshooting.md, Observability.md
33. Update PRD docs: Mark Phase B complete in UpgradePlan.md, mark gaps resolved in GapAnalysis.md
34. Update scripts: simulate-demo.sh — add confirmation workflow simulation; verify-demo.sh and verify.sql — add audit trail verification queries

---

### **Relevant Files**

**New files (11):**

- `services/emergency-alerts/src/modules/alerts/alert-classifier.ts` — tier classification logic
- `services/emergency-alerts/src/modules/alerts/confirmation-engine.service.ts` — confirmation + timeout workflow
- `services/emergency-alerts/src/modules/alerts/escalation.processor.ts` — BullMQ escalation jobs
- `services/emergency-alerts/src/modules/alerts/audit-trail.service.ts` — audit logging
- `services/emergency-alerts/src/modules/alerts/entities/alert-event-log.entity.ts` — audit entity
- `services/emergency-alerts/src/modules/alerts/*.spec.ts` — 4 test files
- `apps/admin-dashboard/src/components/alerts/AlertConfirmationModal.tsx` — confirmation modal
- `apps/admin-dashboard/src/pages/OperationalAlerts.tsx` — Tier 2 dashboard

**Key modified files:**

- init-db.sql — schema changes (enums, columns, new table)
- emergency-alert.entity.ts — new enums + entity columns
- alerts.service.ts — `create()` integrates classifier + confirmation engine
- alerts.processor.ts — tier-aware fan-out gating
- alerts.module.ts — register new queue + providers
- alerts.controller.ts — 5 new endpoints
- AlertCard.tsx — tier badges + confirmation indicator
- AlertDetail.tsx — confirmation actions
- alerts.api.ts — new API methods
- 16+ documentation files (see Phase 10)

---

### **Verification**

1. `cd services/emergency-alerts && pnpm test` — all new + existing tests pass
2. Create PANIC_BUTTON → verify tier=TIER_1, status=PENDING_CONFIRMATION, confirmationDeadlineAt set
3. POST `/alerts/:id/confirm` → verify status=CONFIRMED, parent push+SMS sent
4. POST `/alerts/:id/false-alarm` → verify status=FALSE_ALARM, no parent notification
5. Wait 2+ min on unconfirmed Tier 1 → verify auto-escalation to parents + audit log entry
6. Wait 5 min → Board Admin notified; wait 15 min → OSTA Admin notified
7. Create LATE_DEPARTURE → verify tier=TIER_2, admin-only visibility, no parent notification
8. Presence BOARD/ALIGHT events → verify immediate parent delivery (no confirmation gate)
9. GET `/alerts/:id/audit-trail` → verify all transitions logged with actor, role, timestamp
10. Admin dashboard: trigger Tier 1 alert → confirmation modal appears with countdown → confirm → parent notified
11. Navigate to `/alerts/operational` → only Tier 2 alerts shown
12. Run simulate-demo.sh → alert governance flow in logs
13. Run verify-demo.sh → alert_event_log has entries
14. Admin dashboard with `VITE_USE_MOCK=true` → confirmation modal works with mock data

---

### **Decisions**

- Confirmation timeout = 2 minutes; Escalation: 5 min (Board), 15 min (OSTA), 30 min (critical-unresolved) — per AlertStrategy.md
- ROUTE_DEVIATION starts as admin-only; progressive escalation at 5/15 min thresholds (not full Tier 1 confirmation flow)
- Existing ACTIVE/RESOLVED statuses preserved for backward compatibility; new statuses added alongside
- Parent app: minimal changes — confirmation gate is entirely backend-controlled
- Driver app "Request More Info" response UI: out of scope for Phase B (defer to Phase C)

### **Further Considerations**

1. **Driver "Request Info" responses**: Admin can request info but driver response UI isn't in Phase B scope. Recommendation: notify driver via existing WebSocket, defer response UI to Phase C.
2. **Quiet hours**: AlertStrategy mentions parent quiet-hours config. Recommendation: defer to Phase E (Operational Maturity).
3. **BUS_APPROACHING / ETA_UPDATE**: Mentioned in AlertStrategy Tier 3 but no event generators exist. Recommendation: add enum values now, defer generation logic to Phase E.
