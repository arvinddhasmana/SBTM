-- ============================================================================
-- SBTM v2 — CI / Test Database Initialisation
-- Date: 2026-05-18
--
-- Used by .github/workflows/ci.yml (integration job) to bring a blank
-- Postgres instance up to the v2 schema before E2E tests run.
--
-- Actions:
--   1. Install required Postgres extensions
--   2. Apply the v2 cutover migration (canonical DDL + RLS policies)
--   3. Apply integration-importer staging tables
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Extensions
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- --------------------------------------------------------------------------
-- 2. v2 Core Schema
-- --------------------------------------------------------------------------
\i services/api-gateway/migrations/20260518_v2_cutover.sql

-- --------------------------------------------------------------------------
-- 3. Integration-Importer Staging Tables
-- --------------------------------------------------------------------------
\i services/integration-importer/migrations/20260601_create_stage_tables.sql
