import { AlertClassifierService } from './alert-classifier.service';
import {
  AlertTier,
  EmergencyEventType,
} from './entities/emergency-alert.entity';

describe('AlertClassifierService', () => {
  let service: AlertClassifierService;

  beforeEach(() => {
    const mockConfig = {
      getEventTypeTierMapping: jest.fn().mockResolvedValue(null),
    } as unknown as import('../config/alert-config.service').AlertConfigService;
    service = new AlertClassifierService(mockConfig);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classify()', () => {
    it.each([
      EmergencyEventType.PANIC_BUTTON,
      EmergencyEventType.MEDICAL,
      EmergencyEventType.INCIDENT,
      EmergencyEventType.PANIC_ALERT,
    ])('should classify %s as TIER_1', (eventType) => {
      expect(service.classify(eventType)).toBe(AlertTier.TIER_1);
    });

    it.each([
      EmergencyEventType.ROUTE_DEVIATION,
      EmergencyEventType.LATE_ARRIVAL,
      EmergencyEventType.ROUTE_DIVERSION,
      EmergencyEventType.LATE_DEPARTURE,
      EmergencyEventType.COMPLIANCE,
      EmergencyEventType.OTHER,
    ])('should classify %s as TIER_2', (eventType) => {
      expect(service.classify(eventType)).toBe(AlertTier.TIER_2);
    });

    it('should return TIER_3 for unknown/future event types', () => {
      // Cast to bypass TS enum check — simulates a future event type
      expect(service.classify('CHILD_BOARDED' as EmergencyEventType)).toBe(
        AlertTier.TIER_3,
      );
    });
  });

  describe('isTier1()', () => {
    it('should return true for PANIC_BUTTON', () => {
      expect(service.isTier1(EmergencyEventType.PANIC_BUTTON)).toBe(true);
    });

    it('should return true for MEDICAL', () => {
      expect(service.isTier1(EmergencyEventType.MEDICAL)).toBe(true);
    });

    it('should return false for ROUTE_DEVIATION', () => {
      expect(service.isTier1(EmergencyEventType.ROUTE_DEVIATION)).toBe(false);
    });
  });

  describe('isTier2()', () => {
    it('should return true for LATE_DEPARTURE', () => {
      expect(service.isTier2(EmergencyEventType.LATE_DEPARTURE)).toBe(true);
    });

    it('should return true for COMPLIANCE', () => {
      expect(service.isTier2(EmergencyEventType.COMPLIANCE)).toBe(true);
    });

    it('should return false for PANIC_BUTTON', () => {
      expect(service.isTier2(EmergencyEventType.PANIC_BUTTON)).toBe(false);
    });
  });

  describe('Tier 1 completeness — all safety-critical events require admin confirmation', () => {
    it('MEDICAL is Tier 1 (new event type)', () => {
      expect(service.classify(EmergencyEventType.MEDICAL)).toBe(
        AlertTier.TIER_1,
      );
    });

    it('PANIC_ALERT is Tier 1 (legacy alias)', () => {
      expect(service.classify(EmergencyEventType.PANIC_ALERT)).toBe(
        AlertTier.TIER_1,
      );
    });
  });

  describe('Tier 2 completeness — admin-only operational events', () => {
    it('LATE_DEPARTURE is Tier 2 (new event type)', () => {
      expect(service.classify(EmergencyEventType.LATE_DEPARTURE)).toBe(
        AlertTier.TIER_2,
      );
    });

    it('COMPLIANCE is Tier 2 (new event type)', () => {
      expect(service.classify(EmergencyEventType.COMPLIANCE)).toBe(
        AlertTier.TIER_2,
      );
    });
  });
});
