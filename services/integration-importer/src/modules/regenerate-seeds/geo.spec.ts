import { cumulativeDistances, haversineMeters, offsetMeters } from './geo';

describe('geo', () => {
  describe('haversineMeters', () => {
    it('returns 0 for identical points', () => {
      const p = { lat: 45.42, lon: -75.69 };
      expect(haversineMeters(p, p)).toBe(0);
    });

    it('matches known Ottawa→Pembroke great-circle distance (~118 km) within 5%', () => {
      const ottawa = { lat: 45.4215, lon: -75.6972 };
      const pembroke = { lat: 45.8261, lon: -77.1043 };
      const d = haversineMeters(ottawa, pembroke);
      expect(d).toBeGreaterThan(112_000);
      expect(d).toBeLessThan(124_000);
    });

    it('is symmetric', () => {
      const a = { lat: 45.4, lon: -75.7 };
      const b = { lat: 45.5, lon: -75.8 };
      expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
    });
  });

  describe('offsetMeters', () => {
    it('round-trips north-only offsets through haversine within 1m', () => {
      const p = { lat: 45.42, lon: -75.69 };
      const off = offsetMeters(p, 500, 0);
      expect(haversineMeters(p, off)).toBeGreaterThan(495);
      expect(haversineMeters(p, off)).toBeLessThan(505);
    });

    it('round-trips east-only offsets through haversine within 1m', () => {
      const p = { lat: 45.42, lon: -75.69 };
      const off = offsetMeters(p, 0, 500);
      expect(haversineMeters(p, off)).toBeGreaterThan(495);
      expect(haversineMeters(p, off)).toBeLessThan(505);
    });
  });

  describe('cumulativeDistances', () => {
    it('first element is always 0', () => {
      expect(cumulativeDistances([{ lat: 0, lon: 0 }])).toEqual([0]);
    });

    it('is monotonically non-decreasing', () => {
      const pts = [
        { lat: 45.42, lon: -75.69 },
        { lat: 45.43, lon: -75.69 },
        { lat: 45.43, lon: -75.7 },
      ];
      const c = cumulativeDistances(pts);
      expect(c[0]).toBe(0);
      expect(c[1]).toBeGreaterThan(c[0]);
      expect(c[2]).toBeGreaterThan(c[1]);
    });
  });
});
