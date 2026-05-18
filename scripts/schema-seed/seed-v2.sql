-- ============================================================================
-- SBTM v2 — Minimal Dev Seed
-- Date: 2026-05-18
--
-- Seeds the minimum rows needed to log in and run admin workflows locally.
-- Full transport/ridership data is loaded via integration-importer:
--   pnpm --filter integration-importer run import:dry-run \
--     --bundle docs/Design/samples/two-sta-bundle/osta
--
-- Tables touched: stx_sta, users
-- ============================================================================

BEGIN;

-- ─── OSTA STA ──────────────────────────────────────────────────────────────
-- Fixed UUID so seed-v2.sql is idempotent and references are predictable.
INSERT INTO stx_sta (id, name, short_code, region, time_zone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Ottawa Student Transportation Authority',
  'OSTA',
  'Ottawa, ON',
  'America/Toronto'
)
ON CONFLICT (id) DO NOTHING;

-- ─── RCJTC STA ─────────────────────────────────────────────────────────────
INSERT INTO stx_sta (id, name, short_code, region, time_zone)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Renfrew County Joint Transportation Consortium',
  'RCJTC',
  'Renfrew County, ON',
  'America/Toronto'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Super Admin ───────────────────────────────────────────────────────────
-- anchor_kind / anchor_id NULL — bypasses RLS on every table.
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000000',
  'super.admin@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'SUPER_ADMIN',
  'Super', 'Admin',
  NULL, NULL
)
ON CONFLICT (id) DO NOTHING;

-- ─── OSTA STA Admin ────────────────────────────────────────────────────────
-- anchor_kind='sta', anchor_id → stx_sta(OSTA).id
-- RLS sees all OSTA rows; no RCJTC rows visible without an explicit join bypass.
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'sta.admin@osta.sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'STA_ADMIN',
  'OSTA', 'Admin',
  'sta', '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- ─── RCJTC STA Admin ───────────────────────────────────────────────────────
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  'sta.admin@rcjtc.sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'STA_ADMIN',
  'RCJTC', 'Admin',
  'sta', '00000000-0000-0000-0000-000000000002'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
