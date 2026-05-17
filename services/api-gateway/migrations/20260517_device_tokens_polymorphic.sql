-- Migration: device_tokens polymorphic recipient (user | guardian)
-- Date: 2026-05-17
-- Branch: feat/sbtm-refocus-data-model
-- v2-followups #6
--
-- Why option (b) over shadow users rows:
--   Admin/driver recipients live in `users` (authenticatable identities);
--   parent recipients live in `stx_guardians` (no users row). A single hard FK
--   to `users` would force every guardian to also have a users row, which both
--   conflates "has push tokens" with "can log in" and requires guardian
--   provisioning to mint shadow users rows. The polymorphic split keeps
--   `users` strictly for identities and matches the project's anchor model
--   pattern (anchorKind + anchorId).
--
-- Cascade strategy: TypeORM cannot model a polymorphic FK. We approximate
-- `ON DELETE CASCADE` with two AFTER DELETE triggers — one on `users`, one
-- on `stx_guardians` — each scoped to its own `recipient_kind`.
--
-- Pre-prod cutover: device_tokens is small or empty in every environment, so
-- we do a hard rename (user_id → recipient_id) rather than dual-column shim.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Schema rename + new column
-- ---------------------------------------------------------------------------
-- The historic column name drifted between init-db.sql ("userId", camelCase
-- quoted) and the entity (user_id, snake_case). Handle either shape.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_tokens' AND column_name = 'userId'
  ) THEN
    EXECUTE 'ALTER TABLE device_tokens RENAME COLUMN "userId" TO recipient_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_tokens' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'ALTER TABLE device_tokens RENAME COLUMN user_id TO recipient_id';
  END IF;
END$$;

ALTER TABLE device_tokens
  ADD COLUMN IF NOT EXISTS recipient_kind TEXT NOT NULL
    DEFAULT 'user'
    CHECK (recipient_kind IN ('user', 'guardian'));

-- Existing rows all came from the v1 admin/driver flow → 'user' is correct.
-- Drop the default so future inserts must specify the kind explicitly.
ALTER TABLE device_tokens ALTER COLUMN recipient_kind DROP DEFAULT;

-- ---------------------------------------------------------------------------
-- 2. Indexes + unique constraint
-- ---------------------------------------------------------------------------
ALTER TABLE device_tokens DROP CONSTRAINT IF EXISTS "UQ_device_token_user_token";
DROP INDEX IF EXISTS "IDX_device_tokens_user_active";

ALTER TABLE device_tokens
  ADD CONSTRAINT uq_device_token_recipient_token
  UNIQUE (recipient_kind, recipient_id, token);

CREATE INDEX idx_device_tokens_recipient_active
  ON device_tokens (recipient_kind, recipient_id, "isActive");

-- ---------------------------------------------------------------------------
-- 3. Polymorphic cascade-on-delete via triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION device_tokens_cascade_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM device_tokens
    WHERE recipient_kind = 'user' AND recipient_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION device_tokens_cascade_guardian_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM device_tokens
    WHERE recipient_kind = 'guardian' AND recipient_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_device_tokens_user_cascade ON users;
CREATE TRIGGER trg_device_tokens_user_cascade
  AFTER DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION device_tokens_cascade_user_delete();

DROP TRIGGER IF EXISTS trg_device_tokens_guardian_cascade ON stx_guardians;
CREATE TRIGGER trg_device_tokens_guardian_cascade
  AFTER DELETE ON stx_guardians
  FOR EACH ROW EXECUTE FUNCTION device_tokens_cascade_guardian_delete();

COMMIT;
