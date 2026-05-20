-- ============================================================================
-- SBTM v2 — Minimal Dev Seed
-- Date: 2026-05-20
--
-- Seeds the minimum rows needed to log in and run admin workflows locally.
-- Full transport/ridership data is loaded via integration-importer:
--   pnpm --filter integration-importer run import:dry-run \
--     --bundle docs/Design/samples/two-sta-bundle/osta
--
-- Tables touched: stx_sta, users, stx_drivers, stx_guardians
--
-- Idempotent: safe to run multiple times.
-- users rows use ON CONFLICT (email) DO UPDATE to fix previously NULL anchor_ids.
-- stx_drivers rows use ON CONFLICT (id) DO NOTHING (fixed UUIDs).
-- stx_guardians user_id UPDATE runs unconditionally (idempotent).
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
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- ─── OSTA STA Admin (canonical seed email) ─────────────────────────────────
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
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

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
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- BOARD ADMINS
-- anchor_kind='board', anchor_id → stx_boards row matched by board_code in
-- external_ids. Boards are imported via integration-importer, so UUIDs are
-- not fixed — look them up by external_ids->>'board_code'.
-- ═══════════════════════════════════════════════════════════════════════════

-- OCDSB Board Admin (fixes previously NULL anchor_id)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  'ocdsb.admin@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'BOARD_ADMIN',
  'OCDSB', 'Admin',
  'board', (SELECT id FROM stx_boards WHERE external_ids->>'board_code' = 'OCDSB')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- OCSB Board Admin
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000004',
  'ocsb.admin@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'BOARD_ADMIN',
  'OCSB', 'Admin',
  'board', (SELECT id FROM stx_boards WHERE external_ids->>'board_code' = 'OCSB')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- RCDSB Board Admin
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000005',
  'rcdsb.admin@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'BOARD_ADMIN',
  'RCDSB', 'Admin',
  'board', (SELECT id FROM stx_boards WHERE external_ids->>'board_code' = 'RCDSB')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- RCCDSB Board Admin
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '10000000-0000-0000-0000-000000000006',
  'rccdsb.admin@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'BOARD_ADMIN',
  'RCCDSB', 'Admin',
  'board', (SELECT id FROM stx_boards WHERE external_ids->>'board_code' = 'RCCDSB')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHOOL ADMINS
-- anchor_kind='school', anchor_id → stx_schools row matched by school_code.
-- ═══════════════════════════════════════════════════════════════════════════

-- Maplewood PS (OCDSB-S100) School Admin
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0000-0001-000000000001',
  'admin.maplewood@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'SCHOOL_ADMIN',
  'Admin', 'Maplewood',
  'school', (SELECT id FROM stx_schools WHERE external_ids->>'school_code' = 'OCDSB-S100')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- St. Bernadette (OCSB-S200) School Admin (fixes previously NULL anchor_id)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0000-0001-00000000000a',
  'admin.stbern@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'SCHOOL_ADMIN',
  'Admin', 'St.Bernadette',
  'school', (SELECT id FROM stx_schools WHERE external_ids->>'school_code' = 'OCSB-S200')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- Pinecrest ES (RCDSB-S400) School Admin
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0000-0001-000000000002',
  'admin.pinecrest@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'SCHOOL_ADMIN',
  'Admin', 'Pinecrest',
  'school', (SELECT id FROM stx_schools WHERE external_ids->>'school_code' = 'RCDSB-S400')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- Cathedral HS (RCCDSB-S500) School Admin
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0000-0001-000000000003',
  'admin.cathedral@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'SCHOOL_ADMIN',
  'Admin', 'Cathedral',
  'school', (SELECT id FROM stx_schools WHERE external_ids->>'school_code' = 'RCCDSB-S500')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- DRIVERS
--
-- stx_drivers rows use fixed UUIDs (prefixed 40000000) so users.anchor_id
-- can reference them without a subquery that might return NULL if the operator
-- has not been imported yet.
--
-- operator_id → Stock Transportation Ltd (only operator in two-sta-bundle;
-- imported by integration-importer from sample data).
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO stx_drivers (id, operator_id, external_ids)
VALUES (
  '40000000-0000-0000-0001-00000000000d',
  (SELECT id FROM stx_operators WHERE external_ids->>'operator_code' = 'OP-STOCK'),
  '{"driver_code": "DRV-STBERN-001"}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stx_drivers (id, operator_id, external_ids)
VALUES (
  '40000000-0000-0000-0001-000000000001',
  (SELECT id FROM stx_operators WHERE external_ids->>'operator_code' = 'OP-STOCK'),
  '{"driver_code": "DRV-MAPLE-001"}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stx_drivers (id, operator_id, external_ids)
VALUES (
  '40000000-0000-0000-0001-000000000002',
  (SELECT id FROM stx_operators WHERE external_ids->>'operator_code' = 'OP-STOCK'),
  '{"driver_code": "DRV-PINE-001"}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stx_drivers (id, operator_id, external_ids)
VALUES (
  '40000000-0000-0000-0001-000000000003',
  (SELECT id FROM stx_operators WHERE external_ids->>'operator_code' = 'OP-STOCK'),
  '{"driver_code": "DRV-CATH-001"}'
)
ON CONFLICT (id) DO NOTHING;

-- St. Bernadette driver (fixes anchor from anchor_kind='school' → 'driver')
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0000-0001-00000000000d',
  'driver.stbern@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'DRIVER',
  'Driver', 'StBernadette',
  'driver', '40000000-0000-0000-0001-00000000000d'
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

-- Also link the stx_drivers row back to this user
UPDATE stx_drivers
SET user_id = (SELECT id FROM users WHERE email = 'driver.stbern@sbtm.demo')
WHERE id = '40000000-0000-0000-0001-00000000000d';

-- Maplewood driver
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0000-0001-000000000004',
  'driver.maplewood@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'DRIVER',
  'Driver', 'Maplewood',
  'driver', '40000000-0000-0000-0001-000000000001'
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_drivers
SET user_id = (SELECT id FROM users WHERE email = 'driver.maplewood@sbtm.demo')
WHERE id = '40000000-0000-0000-0001-000000000001';

-- Pinecrest driver
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0000-0001-000000000005',
  'driver.pinecrest@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'DRIVER',
  'Driver', 'Pinecrest',
  'driver', '40000000-0000-0000-0001-000000000002'
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_drivers
SET user_id = (SELECT id FROM users WHERE email = 'driver.pinecrest@sbtm.demo')
WHERE id = '40000000-0000-0000-0001-000000000002';

-- Cathedral driver
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0000-0001-000000000006',
  'driver.cathedral@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'DRIVER',
  'Driver', 'Cathedral',
  'driver', '40000000-0000-0000-0001-000000000003'
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_drivers
SET user_id = (SELECT id FROM users WHERE email = 'driver.cathedral@sbtm.demo')
WHERE id = '40000000-0000-0000-0001-000000000003';

-- ═══════════════════════════════════════════════════════════════════════════
-- PARENT USERS
--
-- Each parent maps to a guardian imported from the sample CSVs. The email
-- addresses below must match the plaintext values in guardians.csv exactly so
-- that the self-activation flow can match the invite token to the guardian row.
--
-- anchor_kind='parent', anchor_id → stx_guardians.id (resolved by guardian_code
-- in external_ids, which is stable and not PII-encrypted).
--
-- The stx_guardians.user_id back-link is set via UPDATE after the user row
-- exists, matching the pattern used for stx_drivers above.
-- ═══════════════════════════════════════════════════════════════════════════

-- OSTA-GRD-0001 — Sam Demo
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '50000000-0000-0000-0001-000000000001',
  'sam.demo@example.test',
  crypt('Parent123!', gen_salt('bf')),
  'PARENT',
  'Sam', 'Demo',
  'parent', (SELECT id FROM stx_guardians WHERE external_ids->>'guardian_code' = 'OSTA-GRD-0001')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_guardians
SET user_id = (SELECT id FROM users WHERE email = 'sam.demo@example.test')
WHERE external_ids->>'guardian_code' = 'OSTA-GRD-0001';

-- OSTA-GRD-0002 — Chris Specimen
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '50000000-0000-0000-0001-000000000002',
  'chris.specimen@example.test',
  crypt('Parent123!', gen_salt('bf')),
  'PARENT',
  'Chris', 'Specimen',
  'parent', (SELECT id FROM stx_guardians WHERE external_ids->>'guardian_code' = 'OSTA-GRD-0002')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_guardians
SET user_id = (SELECT id FROM users WHERE email = 'chris.specimen@example.test')
WHERE external_ids->>'guardian_code' = 'OSTA-GRD-0002';

-- OSTA-GRD-0003 — Pat Sample
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '50000000-0000-0000-0001-000000000003',
  'pat.sample@example.test',
  crypt('Parent123!', gen_salt('bf')),
  'PARENT',
  'Pat', 'Sample',
  'parent', (SELECT id FROM stx_guardians WHERE external_ids->>'guardian_code' = 'OSTA-GRD-0003')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_guardians
SET user_id = (SELECT id FROM users WHERE email = 'pat.sample@example.test')
WHERE external_ids->>'guardian_code' = 'OSTA-GRD-0003';

-- OSTA-GRD-0004 — Kerry Example
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '50000000-0000-0000-0001-000000000004',
  'kerry.example@example.test',
  crypt('Parent123!', gen_salt('bf')),
  'PARENT',
  'Kerry', 'Example',
  'parent', (SELECT id FROM stx_guardians WHERE external_ids->>'guardian_code' = 'OSTA-GRD-0004')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_guardians
SET user_id = (SELECT id FROM users WHERE email = 'kerry.example@example.test')
WHERE external_ids->>'guardian_code' = 'OSTA-GRD-0004';

-- RCJTC-GRD-0001 — Jordan Pembroke
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '50000000-0000-0000-0002-000000000001',
  'jordan.pembroke@example.test',
  crypt('Parent123!', gen_salt('bf')),
  'PARENT',
  'Jordan', 'Pembroke',
  'parent', (SELECT id FROM stx_guardians WHERE external_ids->>'guardian_code' = 'RCJTC-GRD-0001')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_guardians
SET user_id = (SELECT id FROM users WHERE email = 'jordan.pembroke@example.test')
WHERE external_ids->>'guardian_code' = 'RCJTC-GRD-0001';

-- RCJTC-GRD-0002 — Robin Renfrew
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '50000000-0000-0000-0002-000000000002',
  'robin.renfrew@example.test',
  crypt('Parent123!', gen_salt('bf')),
  'PARENT',
  'Robin', 'Renfrew',
  'parent', (SELECT id FROM stx_guardians WHERE external_ids->>'guardian_code' = 'RCJTC-GRD-0002')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_guardians
SET user_id = (SELECT id FROM users WHERE email = 'robin.renfrew@example.test')
WHERE external_ids->>'guardian_code' = 'RCJTC-GRD-0002';

-- RCJTC-GRD-0003 — Alex Cathedral
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '50000000-0000-0000-0002-000000000003',
  'alex.cathedral@example.test',
  crypt('Parent123!', gen_salt('bf')),
  'PARENT',
  'Alex', 'Cathedral',
  'parent', (SELECT id FROM stx_guardians WHERE external_ids->>'guardian_code' = 'RCJTC-GRD-0003')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_guardians
SET user_id = (SELECT id FROM users WHERE email = 'alex.cathedral@example.test')
WHERE external_ids->>'guardian_code' = 'RCJTC-GRD-0003';

-- RCJTC-GRD-0004 — Sage Pinecrest
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '50000000-0000-0000-0002-000000000004',
  'sage.pinecrest@example.test',
  crypt('Parent123!', gen_salt('bf')),
  'PARENT',
  'Sage', 'Pinecrest',
  'parent', (SELECT id FROM stx_guardians WHERE external_ids->>'guardian_code' = 'RCJTC-GRD-0004')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

UPDATE stx_guardians
SET user_id = (SELECT id FROM users WHERE email = 'sage.pinecrest@example.test')
WHERE external_ids->>'guardian_code' = 'RCJTC-GRD-0004';

-- Legacy E2E parent fixture (parent1.stbern@sbtm.demo) — links to OSTA-GRD-0001
-- anchor updated from NULL to match Sam Demo's guardian row so RLS works.
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName",
                   anchor_kind, anchor_id)
VALUES (
  '30000000-0000-0001-0000-000000000001',
  'parent1.stbern@sbtm.demo',
  crypt('Admin123!', gen_salt('bf')),
  'PARENT',
  'Michael', 'Anderson',
  'parent', (SELECT id FROM stx_guardians WHERE external_ids->>'guardian_code' = 'OSTA-GRD-0001')
)
ON CONFLICT (email) DO UPDATE SET
  anchor_kind = EXCLUDED.anchor_kind,
  anchor_id   = EXCLUDED.anchor_id;

COMMIT;
