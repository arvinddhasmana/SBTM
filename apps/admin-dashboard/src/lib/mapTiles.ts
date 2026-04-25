/**
 * Map tile provider configuration.
 *
 * The OpenStreetMap public tile servers (tile.openstreetmap.org) enforce a
 * usage policy that blocks heavy or commercial traffic and requires a
 * meaningful Referer header. Browsers running on production domains often get
 * 403/blocked responses. For production we use a commercial tile provider.
 *
 * Default: MapTiler (OSM-based data, generous free tier, supports commercial).
 *   - Set VITE_MAPTILER_KEY at build time.
 *   - Falls back to OSM tiles only when no key is configured (dev only).
 *
 * To switch providers, change MAPTILER_STYLE or replace getTileLayerConfig.
 */

const MAPTILER_STYLE = 'streets-v2';

export interface TileLayerConfig {
  url: string;
  attribution: string;
  // Leaflet always reads `subdomains.length`, even when the URL has no {s}
  // placeholder. Always supply a value to avoid "Cannot read properties of
  // undefined (reading 'length')" on map mount.
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

  // Dev fallback only. Not safe for production traffic.
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '\u00A9 OpenStreetMap contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  };
}
