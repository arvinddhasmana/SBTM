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
--
-- Idempotent: safe to run multiple times (ON CONFLICT ... DO NOTHING on all rows).
-- stx_sta rows use ON CONFLICT on short_code because the DB may already contain
-- rows seeded by migrations with auto-generated UUIDs.
-- ============================================================================

BEGIN;

-- ─── OSTA STA ──────────────────────────────────────────────────────────────
INSERT INTO stx_sta (id, name, short_code, region, time_zone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Ottawa Student Transportation Authority',
  'OSTA',
  'Ottawa, ON',
  'America/Toronto'
)
ON CONFLICT (short_code) DO NOTHING;

-- ─── RCJTC STA ─────────────────────────────────────────────────────────────
INSERT INTO stx_sta (id, name, short_code, region, time_zone)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Renfrew County Joint Transportation Consortium',
  'RCJTC',
  'Renfrew County, ON',
  'America/Toronto'
)
ON CONFLICT (short_code) DO NOTHING;

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
ON CONFLICT (email) DO NOTHING;

-- ─── OSTA STA Admin (legacy email used by E2E fixtures) ────────────────────
-- anchor_kind='sta', anchor_id → stx_sta(OSTA).id (resolved by short_code so
-- it works regardless of whether the row uses the fixed or auto-generated UUID).
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'sta.admin@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'STA_ADMIN',
  'STA', 'Admin',
  'sta', (SELECT id FROM stx_sta WHERE short_code = 'OSTA')
)
ON CONFLICT (email) DO NOTHING;

-- ─── OSTA STA Admin (canonical email used by seed-v2 / non-E2E tooling) ───
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000011',
  'sta.admin@osta.sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'STA_ADMIN',
  'OSTA', 'Admin',
  'sta', (SELECT id FROM stx_sta WHERE short_code = 'OSTA')
)
ON CONFLICT (email) DO NOTHING;

-- ─── RCJTC STA Admin ───────────────────────────────────────────────────────
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  'sta.admin@rcjtc.sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'STA_ADMIN',
  'RCJTC', 'Admin',
  'sta', (SELECT id FROM stx_sta WHERE short_code = 'RCJTC')
)
ON CONFLICT (email) DO NOTHING;

-- ─── E2E fixture users ─────────────────────────────────────────────────────
-- These match TEST_USERS in apps/admin-dashboard/e2e/fixtures.ts exactly so
-- that loginAs() can perform a real API login during E2E test runs.

-- BOARD_ADMIN — anchor_id left NULL (no FK constraint on users.anchor_id)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  'ocdsb.admin@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'BOARD_ADMIN',
  'OCDSB', 'Admin',
  'board', NULL
)
ON CONFLICT (email) DO NOTHING;

-- SCHOOL_ADMIN
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0000-0001-00000000000a',
  'admin.stbern@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'SCHOOL_ADMIN',
  'Admin', 'St.',
  'school', NULL
)
ON CONFLICT (email) DO NOTHING;

-- DRIVER (used by fixtures for lifecycle-event / GPS helpers)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0000-0001-00000000000d',
  'driver.stbern@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'DRIVER',
  'Driver', 'St.',
  'school', '5aae47fd-88f9-499b-a459-5118a985ad52'
)
ON CONFLICT (email) DO NOTHING;

-- PARENT (used by injectNonAdminSession fixture helper)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0001-0000-000000000001',
  'parent1.stbern@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'PARENT',
  'Michael', 'Anderson',
  NULL, NULL
)
ON CONFLICT (email) DO NOTHING;

COMMIT;
