import { Injectable, Logger } from '@nestjs/common';
import {
  AlertTier,
  EmergencyEventType,
} from './entities/emergency-alert.entity';
import { AlertConfigService } from '../config/alert-config.service';

/**
 * AlertClassifierService
 *
 * Classifies incoming emergency events into alert tiers that govern the
 * confirmation and notification workflow.
 *
 * NOW CONFIGURABLE: Event type to tier mapping is read from database configuration
 * instead of being hardcoded. Falls back to hardcoded defaults if configuration not found.
 *
 * Tier 1 — Safety-critical: require School Admin confirmation before parent delivery.
 * Tier 2 — Operational: visible to admins only. No parent notification.
 * Tier 3 — Informational: bypass confirmation, delivered directly to parents.
 */
@Injectable()
export class AlertClassifierService {
  private readonly logger = new Logger(AlertClassifierService.name);

  // Fallback hardcoded mappings (used if configuration not found)
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

  constructor(private readonly configService: AlertConfigService) {}

  /**
   * Classify an event type into its alert tier.
   * Uses configuration service with fallback to hardcoded defaults.
   * @returns AlertTier.TIER_1, TIER_2, or TIER_3
   */
  async classify(eventType: EmergencyEventType): Promise<AlertTier> {
    try {
      // Try to get tier from configuration
      const tier = await this.configService.getEventTypeTier(eventType);
      return tier;
    } catch (error) {
      this.logger.warn(
        `Failed to get tier from configuration for ${eventType}, using fallback`,
        error,
      );
      // Fallback to hardcoded classification
      return this.classifyFallback(eventType);
    }
  }

  /**
   * Fallback classification using hardcoded rules
   */
  private classifyFallback(eventType: EmergencyEventType): AlertTier {
    if (AlertClassifierService.TIER_1_EVENTS.has(eventType)) {
      return AlertTier.TIER_1;
    }
    if (AlertClassifierService.TIER_2_EVENTS.has(eventType)) {
      return AlertTier.TIER_2;
    }
    return AlertTier.TIER_3;
  }

  async isTier1(eventType: EmergencyEventType): Promise<boolean> {
    const tier = await this.classify(eventType);
    return tier === AlertTier.TIER_1;
  }

  async isTier2(eventType: EmergencyEventType): Promise<boolean> {
    const tier = await this.classify(eventType);
    return tier === AlertTier.TIER_2;
  }
}
