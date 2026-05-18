/**
 * Event-type primitives shared between the v2 alerts service and the
 * (untouched) configuration tables that still store eventType/tier rows.
 *
 * The DTO surface still accepts `eventType` values for wire compatibility
 * (controller route `/api/v1/emergency-events` is preserved). Internally we
 * map each eventType to (category, severity) on the new `stx_alerts` table.
 *
 * The AlertTier enum is retained ONLY because `AlertConfigService` (and the
 * existing alert-config DB rows) still reference TIER_1/TIER_2/TIER_3 values.
 * The runtime alerts service does not branch on tier any more.
 */

export enum EmergencyEventType {
  PANIC_BUTTON = 'PANIC_BUTTON',
  ROUTE_DEVIATION = 'ROUTE_DEVIATION',
  INCIDENT = 'INCIDENT',
  LATE_ARRIVAL = 'LATE_ARRIVAL',
  ROUTE_DIVERSION = 'ROUTE_DIVERSION',
  PANIC_ALERT = 'PANIC_ALERT',
  MEDICAL = 'MEDICAL',
  LATE_DEPARTURE = 'LATE_DEPARTURE',
  COMPLIANCE = 'COMPLIANCE',
  OTHER = 'OTHER',
}

export enum AlertTier {
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}
