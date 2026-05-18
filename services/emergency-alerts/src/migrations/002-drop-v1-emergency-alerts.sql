-- Migration: Drop v1 Emergency Alerts Tables
-- Created: 2026-05-18
-- Purpose: Remove legacy v1 alerting schema after migration to stx_alerts /
--          stx_alert_audit / stx_alert_deliveries / stx_alert_subscriptions.
--
-- The new v2 tables are owned by the api-gateway / SBTM core data model
-- migrations; this file only tears down the obsolete v1 surface that lived
-- inside the emergency-alerts service.

-- =====================================================
-- 1. Drop v1 tables
-- =====================================================
DROP TABLE IF EXISTS alert_notification_log CASCADE;
DROP TABLE IF EXISTS alert_audit_log CASCADE;
DROP TABLE IF EXISTS emergency_alerts CASCADE;

-- =====================================================
-- 2. Drop v1 enums (now unreferenced)
-- =====================================================
DROP TYPE IF EXISTS emergency_event_type_enum CASCADE;
DROP TYPE IF EXISTS emergency_alert_status_enum CASCADE;
DROP TYPE IF EXISTS emergency_alert_tier_enum CASCADE;
DROP TYPE IF EXISTS emergency_alert_escalation_level_enum CASCADE;
DROP TYPE IF EXISTS alert_audit_event_type_enum CASCADE;
DROP TYPE IF EXISTS alert_notification_channel_enum CASCADE;
DROP TYPE IF EXISTS alert_notification_status_enum CASCADE;
