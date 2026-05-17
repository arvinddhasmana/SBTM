import {
  geographyPointTransformer,
  type LatLng,
} from './geography-point.transformer';

// Real EWKB hex from Postgres for SRID=4326;POINT(-75.69 45.42) — captured via
// `SELECT encode(ST_SetSRID(ST_MakePoint(-75.69, 45.42), 4326)::geography::bytea, 'hex')`.
const POINT_HEX = '0101000020e61000005c8fc2f528ec52c0f6285c8fc2b54640';

describe('geographyPointTransformer', () => {
  describe('from (read)', () => {
    it('decodes EWKB hex into {lat, lng}', () => {
      const out = geographyPointTransformer.from(POINT_HEX) as LatLng | null;
      expect(out).not.toBeNull();
      expect(out!.lat).toBeCloseTo(45.42, 5);
      expect(out!.lng).toBeCloseTo(-75.69, 5);
    });

    it('accepts uppercase hex', () => {
      const out = geographyPointTransformer.from(
        POINT_HEX.toUpperCase(),
      ) as LatLng | null;
      expect(out).not.toBeNull();
      expect(out!.lat).toBeCloseTo(45.42, 5);
    });

    it('returns null for null/undefined', () => {
      expect(geographyPointTransformer.from(null)).toBeNull();
      expect(geographyPointTransformer.from(undefined)).toBeNull();
    });

    it('returns null for malformed hex (wrong header)', () => {
      expect(geographyPointTransformer.from('deadbeef')).toBeNull();
    });

    it('returns null for non-string values', () => {
      expect(geographyPointTransformer.from(42)).toBeNull();
      expect(geographyPointTransformer.from({ lat: 1, lng: 2 })).toBeNull();
    });
  });

  describe('to (write)', () => {
    it('emits EWKT for a LatLng', () => {
      expect(geographyPointTransformer.to({ lat: 45.42, lng: -75.69 })).toBe(
        'SRID=4326;POINT(-75.69 45.42)',
      );
    });

    it('returns null for null/undefined input', () => {
      expect(geographyPointTransformer.to(null)).toBeNull();
      expect(geographyPointTransformer.to(undefined)).toBeNull();
    });
  });
});
