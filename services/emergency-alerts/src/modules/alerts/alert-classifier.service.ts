import { Injectable } from '@nestjs/common';
import {
  AlertTier,
  EmergencyEventType,
} from './entities/emergency-alert.entity';

/**
 * AlertClassifierService
 *
 * Classifies incoming emergency events into alert tiers that govern the
 * confirmation and notification workflow.
 *
 * Tier 1 — Safety-critical: require School Admin confirmation before parent delivery.
 *   Events: PANIC_BUTTON, MEDICAL, INCIDENT, PANIC_ALERT
 *
 * Tier 2 — Operational: visible to admins only. No parent notification.
 *   Events: ROUTE_DEVIATION, LATE_ARRIVAL, ROUTE_DIVERSION, LATE_DEPARTURE, COMPLIANCE, OTHER
 *
 * Tier 3 — Informational: bypass confirmation, delivered directly to parents.
 *   Events: Handled externally by the presence service (CHILD_BOARDED, CHILD_ALIGHTED).
 *   Returned here as a fallback classification when a future event type maps to it.
 */
@Injectable()
export class AlertClassifierService {
  private static readonly TIER_1_EVENTS: ReadonlySet<EmergencyEventType> =
    new Set([
      EmergencyEventType.PANIC_BUTTON,
      EmergencyEventType.MEDICAL,
      EmergencyEventType.INCIDENT,
      EmergencyEventType.PANIC_ALERT,
    ]);

  private static readonly TIER_2_EVENTS: ReadonlySet<EmergencyEventType> =
    new Set([
      EmergencyEventType.ROUTE_DEVIATION,
      EmergencyEventType.LATE_ARRIVAL,
      EmergencyEventType.ROUTE_DIVERSION,
      EmergencyEventType.LATE_DEPARTURE,
      EmergencyEventType.COMPLIANCE,
      EmergencyEventType.OTHER,
    ]);

  /**
   * Classify an event type into its alert tier.
   * @returns AlertTier.TIER_1, TIER_2, or TIER_3
   */
  classify(eventType: EmergencyEventType): AlertTier {
    if (AlertClassifierService.TIER_1_EVENTS.has(eventType)) {
      return AlertTier.TIER_1;
    }
    if (AlertClassifierService.TIER_2_EVENTS.has(eventType)) {
      return AlertTier.TIER_2;
    }
    // Future Tier 3 events (e.g. informational presence events routed here)
    return AlertTier.TIER_3;
  }

  isTier1(eventType: EmergencyEventType): boolean {
    return AlertClassifierService.TIER_1_EVENTS.has(eventType);
  }

  isTier2(eventType: EmergencyEventType): boolean {
    return AlertClassifierService.TIER_2_EVENTS.has(eventType);
  }
}
