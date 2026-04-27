/**
 * Map tile provider configuration for the parent web app.
 *
 * See apps/admin-dashboard/src/lib/mapTiles.ts for rationale.
 * Production must set VITE_MAPTILER_KEY at build time. The OSM fallback is
 * dev-only and will be blocked on busy production domains by the OSM tile
 * usage policy.
 */

const MAPTILER_STYLE = 'streets-v2';

export interface TileLayerConfig {
  url: string;
  attribution: string;
  // Leaflet reads `subdomains.length` unconditionally; always supply a value.
  subdomains: string[];
  maxZoom: number;
}

export function getTileLayerConfig(): TileLayerConfig {
  const key = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

  if (key && key.trim().length > 0) {
    return {
      url: `https://api.maptiler.com/maps/${MAPTILER_STYLE}/256/{z}/{x}/{y}.png?key=${key}`,
      attribution:
        '\u00A9 <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> ' +
        '\u00A9 <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
      subdomains: ['a', 'b', 'c'],
      maxZoom: 20,
    };
  }

  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  };
}
