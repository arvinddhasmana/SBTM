-- Migration: drop v1 presence_event table and its enums
-- Date: 2026-05-18
-- Branch: feat/sbtm-refocus-data-model
-- Description:
--   Aggressive cutover for SBTM Phase B. student-presence now writes to
--   v2 `stx_boarding_events` (DDL owned by api-gateway). This drops the v1
--   `presence_event` table and its enum types. No data preservation.
--
--   The api-gateway v2 cutover migration (20260518_v2_cutover.sql) already
--   handles `presence_notification_log` (singular legacy). The
--   `presence_notification_logs` (plural) table — internal queue/log for the
--   notification processor — is retained.

BEGIN;

DROP TABLE IF EXISTS presence_event CASCADE;

DROP TYPE IF EXISTS presence_event_eventtype_enum CASCADE;
DROP TYPE IF EXISTS presence_event_source_enum CASCADE;

COMMIT;
