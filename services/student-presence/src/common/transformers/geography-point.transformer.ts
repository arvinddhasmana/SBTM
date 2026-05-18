import type { ValueTransformer } from 'typeorm';

/**
 * Latitude/longitude pair persisted to a PostGIS `geography(Point, 4326)` column.
 *
 * Mirrors `services/api-gateway/src/common/transformers/geography-point.transformer.ts`
 * — student-presence owns its own schema declarations, so we keep a local copy
 * rather than depending on api-gateway internals.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

const EWKB_POINT_4326_LE_HEADER = '0101000020e6100000';

function parseEwkbPoint(hex: string): LatLng | null {
  const lower = hex.toLowerCase();
  if (!lower.startsWith(EWKB_POINT_4326_LE_HEADER)) return null;
  if (lower.length !== EWKB_POINT_4326_LE_HEADER.length + 32) return null;
  const buf = Buffer.from(lower, 'hex');
  const lng = buf.readDoubleLE(9);
  const lat = buf.readDoubleLE(17);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export const geographyPointTransformer: ValueTransformer = {
  from: (value: unknown): LatLng | null => {
    if (value == null) return null;
    if (typeof value === 'string') return parseEwkbPoint(value);
    return null;
  },
  to: (value: LatLng | null | undefined): string | null => {
    if (!value) return null;
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
};
