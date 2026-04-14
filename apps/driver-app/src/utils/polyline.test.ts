import { decodePolyline } from './polyline';

describe('decodePolyline', () => {
  it('should decode a known Google polyline string to coordinates', () => {
    // Known test encoding: "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
    // Expected output approximately: [(38.5, -120.2), (40.7, -120.95), (43.252, -126.453)]
    const result = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');

    expect(result).toHaveLength(3);

    // First point
    expect(result[0][0]).toBeCloseTo(38.5, 1);
    expect(result[0][1]).toBeCloseTo(-120.2, 1);

    // Second point
    expect(result[1][0]).toBeCloseTo(40.7, 1);
    expect(result[1][1]).toBeCloseTo(-120.95, 1);

    // Third point
    expect(result[2][0]).toBeCloseTo(43.252, 1);
    expect(result[2][1]).toBeCloseTo(-126.453, 1);
  });

  it('should return an empty array for an empty string', () => {
    const result = decodePolyline('');
    expect(result).toEqual([]);
  });

  it('should return tuples of [lat, lng]', () => {
    const result = decodePolyline('_p~iF~ps|U');
    expect(result).toHaveLength(1);
    expect(Array.isArray(result[0])).toBe(true);
    expect(result[0]).toHaveLength(2);
  });
});
