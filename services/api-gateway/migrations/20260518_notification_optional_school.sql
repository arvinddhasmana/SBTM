-- Migration: notification scope context becomes optional
-- Date: 2026-05-18
-- Branch: feat/sbtm-refocus-data-model
-- v2-followups #1 (parent gateway anchor migration) + #6 (device_tokens polymorphic)
--
-- Why: v2 alerts (stx_alerts.scope_kind) span 'sta' | 'board' | 'school' |
-- 'route'. A guardian can have children across multiple boards/schools within
-- one STA, so requiring schoolId on every notification blocked the parent
-- flows. device_tokens is recipient-anchored (kind + id), not school-scoped:
-- a guardian's push token is the same wherever the alert originates. And the
-- delivery log keeps school_id/board_id as nullable audit context so
-- per-tenant filtering still works for school/board-scope alerts.
--
-- Changes:
--   device_tokens
--     - DROP COLUMN school_id (redundant given polymorphic recipient)
--   notification_delivery_log
--     - ALTER school_id DROP NOT NULL
--     - ADD COLUMN board_id uuid NULL
--     - ADD INDEX on board_id

BEGIN;

-- ---------------------------------------------------------------------------
-- device_tokens — drop school_id
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "IDX_device_tokens_schoolId";
DROP INDEX IF EXISTS idx_device_tokens_school_id;

ALTER TABLE device_tokens DROP COLUMN IF EXISTS school_id;

-- ---------------------------------------------------------------------------
-- notification_delivery_log — school_id nullable, add board_id
-- ---------------------------------------------------------------------------
ALTER TABLE notification_delivery_log
  ALTER COLUMN school_id DROP NOT NULL;

ALTER TABLE notification_delivery_log
  ADD COLUMN IF NOT EXISTS board_id uuid;

CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_board_id
  ON notification_delivery_log (board_id);

COMMIT;
