import { Injectable } from '@nestjs/common';
import { EmergencyEventType } from './event-types';
import { AlertCategory, AlertSeverity } from './entities/alert.entity';

export interface AlertClassification {
  category: AlertCategory;
  severity: AlertSeverity;
}

/**
 * AlertClassifierService
 *
 * Maps a v1-style `eventType` enum value to the v2 `(category, severity)`
 * pair used to populate `stx_alerts`. The mapping table is fixed per the
 * Phase B migration spec — there is no dynamic config lookup any more. The
 * previous tier-based escalation workflow has been removed in v2; all alerts
 * land directly as `status = 'active'`.
 */
@Injectable()
export class AlertClassifierService {
  private static readonly TABLE: Record<string, AlertClassification> = {
    [EmergencyEventType.PANIC_BUTTON]: {
      category: AlertCategory.SAFETY,
      severity: AlertSeverity.CRITICAL,
    },
    [EmergencyEventType.PANIC_ALERT]: {
      category: AlertCategory.SAFETY,
      severity: AlertSeverity.CRITICAL,
    },
    [EmergencyEventType.MEDICAL]: {
      category: AlertCategory.SAFETY,
      severity: AlertSeverity.CRITICAL,
    },
    [EmergencyEventType.INCIDENT]: {
      category: AlertCategory.SAFETY,
      severity: AlertSeverity.WARNING,
    },
    [EmergencyEventType.ROUTE_DEVIATION]: {
      category: AlertCategory.ROUTE_DEVIATION,
      severity: AlertSeverity.WARNING,
    },
    [EmergencyEventType.ROUTE_DIVERSION]: {
      category: AlertCategory.ROUTE_DEVIATION,
      severity: AlertSeverity.WARNING,
    },
    [EmergencyEventType.LATE_ARRIVAL]: {
      category: AlertCategory.ROUTE_DELAYED,
      severity: AlertSeverity.INFO,
    },
    [EmergencyEventType.LATE_DEPARTURE]: {
      category: AlertCategory.ROUTE_DELAYED,
      severity: AlertSeverity.INFO,
    },
    [EmergencyEventType.COMPLIANCE]: {
      category: AlertCategory.GENERAL,
      severity: AlertSeverity.WARNING,
    },
    [EmergencyEventType.OTHER]: {
      category: AlertCategory.GENERAL,
      severity: AlertSeverity.INFO,
    },
  };

  classify(eventType: EmergencyEventType | string): AlertClassification {
    return (
      AlertClassifierService.TABLE[eventType] ?? {
        category: AlertCategory.GENERAL,
        severity: AlertSeverity.INFO,
      }
    );
  }
}
