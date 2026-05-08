-- ============================================================================
-- SBTM Standard Seed Data
-- Date: April 12, 2026
--
-- Standard seed data that exists regardless of demo scenario:
--   - 2 School Boards (OCDSB, OCSB)
--   - System admin users (Super Admin, OSTA Admin, Board Admins)
-- ============================================================================

BEGIN;

-- ===================== School Boards =====================

INSERT INTO school_boards (id, name) VALUES
    ('b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Ottawa-Carleton District School Board'),
    ('b1a2b3c4-d5e6-4f7a-8b9c-1d2e3f4a5b6c', 'Ottawa Catholic School Board')
ON CONFLICT DO NOTHING;

-- ===================== System Admin Users =====================

-- Super Admin (system bootstrap)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName") VALUES
    ('10000000-0000-0000-0000-000000000000', 'super.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'SUPER_ADMIN', 'Super', 'Admin')
ON CONFLICT DO NOTHING;

-- OSTA Admin (cross-board oversight)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "boardId") VALUES
    ('10000000-0000-0000-0000-000000000001', 'osta.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'OSTA_ADMIN', 'OSTA', 'Admin', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c')
ON CONFLICT DO NOTHING;

-- Board Admins (one per board)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "boardId") VALUES
    ('10000000-0000-0000-0000-000000000003', 'ocdsb.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'BOARD_ADMIN', 'OCDSB', 'Admin', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000004', 'ocsb.admin@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'BOARD_ADMIN', 'OCSB',  'Admin', 'b1a2b3c4-d5e6-4f7a-8b9c-1d2e3f4a5b6c')
ON CONFLICT DO NOTHING;

COMMIT;
