-- SBTM Demo Verification Queries
-- GPS tracking
SELECT COUNT(*) as location_count FROM location_points;
SELECT route_id, COUNT(*) as points FROM location_points GROUP BY route_id ORDER BY route_id;

-- Alert Governance (Phase B)
SELECT 'emergency_alert' as table_name, COUNT(*) as total FROM emergency_alert;
SELECT id, "eventType", status, tier, "escalationLevel", "confirmedBy", "confirmedAt", "createdAt" FROM emergency_alert ORDER BY "createdAt" DESC LIMIT 10;

SELECT 'alert_audit_log' as table_name, COUNT(*) as total FROM alert_audit_log;
SELECT "alertId", "eventType", "actorRole", "escalationLevel", notes, "eventTimestamp" FROM alert_audit_log ORDER BY "eventTimestamp" DESC LIMIT 20;
