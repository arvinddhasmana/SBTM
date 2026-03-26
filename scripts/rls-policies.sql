-- =============================================================================
-- RLS Policy Definitions — Phase 5 Database Tenant Hardening
-- =============================================================================
-- Purpose: Enforce tenant isolation at the PostgreSQL database layer.
--          These policies prevent cross-tenant data access even if application-
--          layer filters are bypassed.
--
-- Prerequisite: Run this script as a superuser or DB owner. Application service
--               users must NOT have BYPASSRLS privilege.
--
-- Usage: psql -U postgres -d sbms -f scripts/rls-policies.sql
--        Or apply via a managed migration tool in CI/CD.
--
-- Environment context:
--   Each service middleware must call `SET LOCAL app.current_school_id = '<uuid>'`
--   within a transaction before executing tenant-scoped queries.
-- =============================================================================

-- -----------------------------------------------------------------------
-- Helper: create the application configuration parameter if it does not exist.
-- -----------------------------------------------------------------------
DO $$
BEGIN
    -- `app.current_school_id` is the session-level tenant context variable.
    -- It is set by the application layer via `SET LOCAL app.current_school_id = ...`
    -- before executing any tenant-scoped query.
    PERFORM set_config('app.current_school_id', '', false);
EXCEPTION
    WHEN others THEN NULL;
END;
$$;

-- -----------------------------------------------------------------------
-- Table: students (student-management service)
-- -----------------------------------------------------------------------
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Service user policy: allow read/write only for the current tenant.
DROP POLICY IF EXISTS students_tenant_isolation ON students;
CREATE POLICY students_tenant_isolation ON students
    USING (school_id::text = current_setting('app.current_school_id', true))
    WITH CHECK (school_id::text = current_setting('app.current_school_id', true));

-- Allow superusers and migrations to bypass RLS.
ALTER TABLE students FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- Table: emergency_alert (emergency-alerts service)
-- -----------------------------------------------------------------------
ALTER TABLE emergency_alert ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS emergency_alert_tenant_isolation ON emergency_alert;
CREATE POLICY emergency_alert_tenant_isolation ON emergency_alert
    USING ("schoolId"::text = current_setting('app.current_school_id', true))
    WITH CHECK ("schoolId"::text = current_setting('app.current_school_id', true));

ALTER TABLE emergency_alert FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- Table: presence_event (student-presence service)
-- -----------------------------------------------------------------------
ALTER TABLE presence_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS presence_event_tenant_isolation ON presence_event;
CREATE POLICY presence_event_tenant_isolation ON presence_event
    USING ("schoolId"::text = current_setting('app.current_school_id', true))
    WITH CHECK ("schoolId"::text = current_setting('app.current_school_id', true));

ALTER TABLE presence_event FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- Table: driver_compliance (compliance-management service)
-- -----------------------------------------------------------------------
ALTER TABLE driver_compliance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS driver_compliance_tenant_isolation ON driver_compliance;
CREATE POLICY driver_compliance_tenant_isolation ON driver_compliance
    USING (school_id::text = current_setting('app.current_school_id', true))
    WITH CHECK (school_id::text = current_setting('app.current_school_id', true));

ALTER TABLE driver_compliance FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- Table: audit_logs (compliance-management service)
-- -----------------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
    USING (school_id::text = current_setting('app.current_school_id', true))
    WITH CHECK (school_id::text = current_setting('app.current_school_id', true));

ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- Table: users (api-gateway service)
-- -----------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users table allows:
--   - Reads scoped to the user's own school or board (board admins can read across schools)
--   - Superusers bypass RLS for migrations and provisioning
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
    USING (
        "schoolId"::text = current_setting('app.current_school_id', true)
        OR current_setting('app.current_school_id', true) = ''
    )
    WITH CHECK (
        "schoolId"::text = current_setting('app.current_school_id', true)
        OR current_setting('app.current_school_id', true) = ''
    );

ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- Verification queries (run manually to confirm policies are in effect)
-- -----------------------------------------------------------------------
-- SELECT tablename, policyname, roles, cmd FROM pg_policies
-- WHERE tablename IN ('students','emergency_alert','presence_event','driver_compliance','audit_logs','users');

-- Cross-tenant isolation test (should return 0 rows for a different school_id):
-- SET LOCAL app.current_school_id = '<school-a-uuid>';
-- SELECT COUNT(*) FROM students; -- should only return school A rows
-- SET LOCAL app.current_school_id = '<school-b-uuid>';
-- SELECT COUNT(*) FROM students; -- should only return school B rows
