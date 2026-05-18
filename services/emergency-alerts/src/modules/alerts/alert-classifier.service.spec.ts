import { AlertClassifierService } from './alert-classifier.service';
import { EmergencyEventType } from './event-types';
import { AlertCategory, AlertSeverity } from './entities/alert.entity';

describe('AlertClassifierService', () => {
  let service: AlertClassifierService;

  beforeEach(() => {
    service = new AlertClassifierService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classify()', () => {
    it.each([
      EmergencyEventType.PANIC_BUTTON,
      EmergencyEventType.PANIC_ALERT,
      EmergencyEventType.MEDICAL,
    ])('maps %s to safety/critical', (eventType) => {
      const result = service.classify(eventType);
      expect(result.category).toBe(AlertCategory.SAFETY);
      expect(result.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('maps INCIDENT to safety/warning', () => {
      const result = service.classify(EmergencyEventType.INCIDENT);
      expect(result.category).toBe(AlertCategory.SAFETY);
      expect(result.severity).toBe(AlertSeverity.WARNING);
    });

    it.each([
      EmergencyEventType.ROUTE_DEVIATION,
      EmergencyEventType.ROUTE_DIVERSION,
    ])('maps %s to route_deviation/warning', (eventType) => {
      const result = service.classify(eventType);
      expect(result.category).toBe(AlertCategory.ROUTE_DEVIATION);
      expect(result.severity).toBe(AlertSeverity.WARNING);
    });

    it.each([
      EmergencyEventType.LATE_ARRIVAL,
      EmergencyEventType.LATE_DEPARTURE,
    ])('maps %s to route_delayed/info', (eventType) => {
      const result = service.classify(eventType);
      expect(result.category).toBe(AlertCategory.ROUTE_DELAYED);
      expect(result.severity).toBe(AlertSeverity.INFO);
    });

    it('maps COMPLIANCE to general/warning', () => {
      const result = service.classify(EmergencyEventType.COMPLIANCE);
      expect(result.category).toBe(AlertCategory.GENERAL);
      expect(result.severity).toBe(AlertSeverity.WARNING);
    });

    it('maps OTHER to general/info', () => {
      const result = service.classify(EmergencyEventType.OTHER);
      expect(result.category).toBe(AlertCategory.GENERAL);
      expect(result.severity).toBe(AlertSeverity.INFO);
    });

    it('defaults to general/info for unknown event types', () => {
      const result = service.classify('CHILD_BOARDED' as EmergencyEventType);
      expect(result.category).toBe(AlertCategory.GENERAL);
      expect(result.severity).toBe(AlertSeverity.INFO);
    });
  });
});
