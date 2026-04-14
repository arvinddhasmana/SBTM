import { describe, it, expect } from 'vitest';
import { decodePolyline } from './polyline';

describe('decodePolyline', () => {
  it('should decode a known polyline string to coordinates', () => {
    // Standard Google polyline encoding example
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const result = decodePolyline(encoded);

    expect(result).toHaveLength(3);

    // First point: approximately (38.5, -120.2)
    expect(result[0][0]).toBeCloseTo(38.5, 0);
    expect(result[0][1]).toBeCloseTo(-120.2, 0);

    // Second point: approximately (40.7, -120.95)
    expect(result[1][0]).toBeCloseTo(40.7, 0);
    expect(result[1][1]).toBeCloseTo(-120.95, 0);

    // Third point: approximately (43.25, -126.45)
    expect(result[2][0]).toBeCloseTo(43.252, 0);
    expect(result[2][1]).toBeCloseTo(-126.453, 0);
  });

  it('should return an empty array for an empty string', () => {
    const result = decodePolyline('');
    expect(result).toEqual([]);
  });

  it('should decode a single point', () => {
    // Encode a single point near (0, 0) - the simplest encoding
    const encoded = '??';
    const result = decodePolyline(encoded);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toBeCloseTo(0, 4);
    expect(result[0][1]).toBeCloseTo(0, 4);
  });

  it('should produce coordinates with latitude and longitude', () => {
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const result = decodePolyline(encoded);

    result.forEach((point) => {
      expect(point).toHaveLength(2);
      const [lat, lng] = point;
      // Latitude should be between -90 and 90
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      // Longitude should be between -180 and 180
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    });
  });

  it('should handle negative coordinate deltas correctly', () => {
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const result = decodePolyline(encoded);

    // All longitudes in this test are negative
    result.forEach((point) => {
      expect(point[1]).toBeLessThan(0);
    });
  });
});
