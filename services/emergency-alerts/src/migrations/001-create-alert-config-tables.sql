-- Migration: Create Alert Configuration Tables
-- Created: 2026-04-29
-- Purpose: Implement configurable alerts and notifications system (Option 1)

-- =====================================================
-- 1. Alert Event Type Configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_event_type_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) UNIQUE NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('TIER_1', 'TIER_2', 'TIER_3')),
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  requires_confirmation BOOLEAN DEFAULT false,
  notify_parents BOOLEAN DEFAULT false,
  is_system_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_type_config_tier ON alert_event_type_config(tier) WHERE is_active = true;
CREATE INDEX idx_event_type_config_active ON alert_event_type_config(is_active);

-- =====================================================
-- 2. Alert Escalation Timing Configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_escalation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name VARCHAR(100) UNIQUE NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('TIER_1', 'TIER_2', 'TIER_3')),
  confirmation_timeout_ms INTEGER CHECK (confirmation_timeout_ms > 0),
  board_escalation_ms INTEGER CHECK (board_escalation_ms > 0),
  osta_escalation_ms INTEGER CHECK (osta_escalation_ms > 0),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escalation_config_tier ON alert_escalation_config(tier) WHERE is_active = true;
CREATE UNIQUE INDEX idx_escalation_config_default ON alert_escalation_config(tier) WHERE is_default = true AND is_active = true;

-- =====================================================
-- 3. Alert Escalation Chain Configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_escalation_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name VARCHAR(100) NOT NULL,
  sequence_order INTEGER NOT NULL CHECK (sequence_order >= 0),
  escalation_level VARCHAR(50) NOT NULL CHECK (escalation_level IN ('SCHOOL', 'BOARD', 'STA')),
  time_threshold_ms INTEGER NOT NULL CHECK (time_threshold_ms >= 0),
  notification_channels JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_name, sequence_order)
);

CREATE INDEX idx_escalation_chain_config ON alert_escalation_chain(config_name) WHERE is_active = true;

-- =====================================================
-- 4. Notification Routing Configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_routing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('TIER_1', 'TIER_2', 'TIER_3')),
  event_type VARCHAR(50),
  recipient_role VARCHAR(50) NOT NULL CHECK (recipient_role IN ('SUPER_ADMIN', 'STA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN', 'DRIVER', 'PARENT', 'SYSTEM')),
  notification_timing VARCHAR(50) NOT NULL CHECK (notification_timing IN ('IMMEDIATE', 'AFTER_CONFIRMATION', 'ON_TIMEOUT', 'ON_ESCALATION')),
  channels JSONB NOT NULL,
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_routing_tier ON notification_routing_config(tier) WHERE is_active = true;
CREATE INDEX idx_notification_routing_role ON notification_routing_config(recipient_role) WHERE is_active = true;

-- =====================================================
-- 5. Alert Workflow Configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_workflow_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_name VARCHAR(50) NOT NULL CHECK (action_name IN ('CONFIRM', 'FALSE_ALARM', 'REQUEST_INFO', 'RESOLVE', 'STATUS_UPDATE')),
  allowed_for_tier VARCHAR(20) NOT NULL CHECK (allowed_for_tier IN ('TIER_1', 'TIER_2', 'TIER_3')),
  allowed_for_status VARCHAR(50) NOT NULL CHECK (allowed_for_status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'AUTO_ESCALATED', 'ACTIVE', 'RESOLVED', 'FALSE_ALARM')),
  required_role VARCHAR(50) NOT NULL CHECK (required_role IN ('SUPER_ADMIN', 'STA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN', 'DRIVER', 'SYSTEM')),
  requires_notes BOOLEAN DEFAULT false,
  status_transition VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(action_name, allowed_for_tier, allowed_for_status)
);

CREATE INDEX idx_workflow_config_tier_status ON alert_workflow_config(allowed_for_tier, allowed_for_status) WHERE is_active = true;

-- =====================================================
-- 6. Alert Configuration Audit Log
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_table VARCHAR(100) NOT NULL,
  config_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE')),
  changed_by_user_id UUID NOT NULL,
  changed_by_role VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_config_audit_table_id ON alert_config_audit(config_table, config_id);
CREATE INDEX idx_config_audit_user ON alert_config_audit(changed_by_user_id);
CREATE INDEX idx_config_audit_created ON alert_config_audit(created_at DESC);

-- =====================================================
-- 7. Configuration Change Request (Optional)
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_config_change_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by_user_id UUID NOT NULL,
  requested_by_role VARCHAR(50) NOT NULL,
  config_type VARCHAR(100) NOT NULL,
  change_description TEXT NOT NULL,
  current_config JSONB,
  requested_config JSONB NOT NULL,
  justification TEXT,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'IMPLEMENTED')),
  reviewed_by_user_id UUID,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_change_request_status ON alert_config_change_request(status);
CREATE INDEX idx_change_request_user ON alert_config_change_request(requested_by_user_id);
CREATE INDEX idx_change_request_reviewer ON alert_config_change_request(reviewed_by_user_id) WHERE reviewed_by_user_id IS NOT NULL;

-- =====================================================
-- 8. Seed Default Configurations (Maintain Current Behavior)
-- =====================================================

-- Event Type Configuration (Current hardcoded values)
INSERT INTO alert_event_type_config (event_type, tier, display_name, description, requires_confirmation, notify_parents, is_system_default, is_active)
VALUES
  ('PANIC_BUTTON', 'TIER_1', 'Panic Button', 'Driver activated panic button', true, true, true, true),
  ('MEDICAL', 'TIER_1', 'Medical Emergency', 'Medical emergency reported', true, true, true, true),
  ('INCIDENT', 'TIER_1', 'Incident', 'General incident reported', true, true, true, true),
  ('PANIC_ALERT', 'TIER_1', 'Panic Alert', 'Panic alert triggered', true, true, true, true),
  ('ROUTE_DEVIATION', 'TIER_2', 'Route Deviation', 'Bus deviated from planned route', false, false, true, true),
  ('LATE_ARRIVAL', 'TIER_2', 'Late Arrival', 'Bus is running late', false, false, true, true),
  ('ROUTE_DIVERSION', 'TIER_2', 'Route Diversion', 'Planned route diversion', false, false, true, true),
  ('LATE_DEPARTURE', 'TIER_2', 'Late Departure', 'Bus departed late', false, false, true, true),
  ('COMPLIANCE', 'TIER_2', 'Compliance Issue', 'Compliance related alert', false, false, true, true),
  ('OTHER', 'TIER_2', 'Other', 'Other operational alert', false, false, true, true)
ON CONFLICT (event_type) DO NOTHING;

-- Escalation Timing Configuration (Current hardcoded values)
INSERT INTO alert_escalation_config (config_name, tier, confirmation_timeout_ms, board_escalation_ms, osta_escalation_ms, is_default, is_active)
VALUES
  ('tier1-default', 'TIER_1', 120000, 300000, 900000, true, true),
  ('tier2-default', 'TIER_2', NULL, NULL, NULL, true, true),
  ('tier3-default', 'TIER_3', NULL, NULL, NULL, true, true)
ON CONFLICT (config_name) DO NOTHING;

-- Escalation Chain Configuration (Current hardcoded escalation path)
INSERT INTO alert_escalation_chain (config_name, sequence_order, escalation_level, time_threshold_ms, notification_channels, is_active)
VALUES
  ('default-chain', 0, 'SCHOOL', 0, '["WEBSOCKET", "PUSH"]', true),
  ('default-chain', 1, 'BOARD', 300000, '["WEBSOCKET", "PUSH", "SMS"]', true),
  ('default-chain', 2, 'STA', 900000, '["WEBSOCKET", "PUSH", "SMS", "EMAIL"]', true)
ON CONFLICT (config_name, sequence_order) DO NOTHING;

-- Notification Routing Configuration
INSERT INTO notification_routing_config (tier, event_type, recipient_role, notification_timing, channels, is_mandatory, is_active)
VALUES
  -- Tier 1: School Admin (immediate)
  ('TIER_1', NULL, 'SCHOOL_ADMIN', 'IMMEDIATE', '["WEBSOCKET", "PUSH"]', true, true),
  -- Tier 1: Board Admin (informational copy)
  ('TIER_1', NULL, 'BOARD_ADMIN', 'IMMEDIATE', '["WEBSOCKET"]', false, true),
  -- Tier 1: STA Admin (informational copy)
  ('TIER_1', NULL, 'STA_ADMIN', 'IMMEDIATE', '["WEBSOCKET"]', false, true),
  -- Tier 1: Parents (after confirmation or timeout)
  ('TIER_1', NULL, 'PARENT', 'AFTER_CONFIRMATION', '["PUSH", "SMS"]', true, true),
  ('TIER_1', NULL, 'PARENT', 'ON_TIMEOUT', '["PUSH", "SMS"]', true, true),
  -- Tier 2: School Admin only
  ('TIER_2', NULL, 'SCHOOL_ADMIN', 'IMMEDIATE', '["WEBSOCKET"]', true, true),
  -- Tier 3: Parents immediately
  ('TIER_3', NULL, 'PARENT', 'IMMEDIATE', '["PUSH"]', true, true)
ON CONFLICT DO NOTHING;

-- Workflow Action Configuration
INSERT INTO alert_workflow_config (action_name, allowed_for_tier, allowed_for_status, required_role, requires_notes, status_transition, is_active)
VALUES
  -- Confirm action (Tier 1 only, pending confirmation)
  ('CONFIRM', 'TIER_1', 'PENDING_CONFIRMATION', 'SCHOOL_ADMIN', false, 'CONFIRMED', true),
  -- False alarm action (Tier 1, pending confirmation)
  ('FALSE_ALARM', 'TIER_1', 'PENDING_CONFIRMATION', 'SCHOOL_ADMIN', false, 'FALSE_ALARM', true),
  -- Request info action (Tier 1, pending confirmation)
  ('REQUEST_INFO', 'TIER_1', 'PENDING_CONFIRMATION', 'SCHOOL_ADMIN', false, NULL, true),
  -- Resolve action (all tiers, various statuses)
  ('RESOLVE', 'TIER_1', 'CONFIRMED', 'SCHOOL_ADMIN', false, 'RESOLVED', true),
  ('RESOLVE', 'TIER_1', 'AUTO_ESCALATED', 'SCHOOL_ADMIN', false, 'RESOLVED', true),
  ('RESOLVE', 'TIER_1', 'ACTIVE', 'SCHOOL_ADMIN', false, 'RESOLVED', true),
  ('RESOLVE', 'TIER_2', 'ACTIVE', 'SCHOOL_ADMIN', false, 'RESOLVED', true),
  ('RESOLVE', 'TIER_3', 'ACTIVE', 'SCHOOL_ADMIN', false, 'RESOLVED', true),
  -- Status update action (all tiers, active statuses)
  ('STATUS_UPDATE', 'TIER_1', 'CONFIRMED', 'SCHOOL_ADMIN', true, NULL, true),
  ('STATUS_UPDATE', 'TIER_1', 'AUTO_ESCALATED', 'SCHOOL_ADMIN', true, NULL, true),
  ('STATUS_UPDATE', 'TIER_1', 'PENDING_CONFIRMATION', 'SCHOOL_ADMIN', true, NULL, true),
  ('STATUS_UPDATE', 'TIER_1', 'ACTIVE', 'SCHOOL_ADMIN', true, NULL, true),
  ('STATUS_UPDATE', 'TIER_2', 'ACTIVE', 'SCHOOL_ADMIN', true, NULL, true),
  ('STATUS_UPDATE', 'TIER_3', 'ACTIVE', 'SCHOOL_ADMIN', true, NULL, true)
ON CONFLICT (action_name, allowed_for_tier, allowed_for_status) DO NOTHING;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE alert_event_type_config IS 'Configuration for alert event types and their tier assignments';
COMMENT ON TABLE alert_escalation_config IS 'Configuration for escalation timing per tier';
COMMENT ON TABLE alert_escalation_chain IS 'Configuration for escalation chain and notification channels';
COMMENT ON TABLE notification_routing_config IS 'Configuration for notification routing rules';
COMMENT ON TABLE alert_workflow_config IS 'Configuration for workflow actions and permissions';
COMMENT ON TABLE alert_config_audit IS 'Audit log for all configuration changes';
COMMENT ON TABLE alert_config_change_request IS 'Change requests from Board/School Admins';
