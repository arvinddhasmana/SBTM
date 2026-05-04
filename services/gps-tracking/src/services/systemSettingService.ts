/**
 * SystemSettingService
 *
 * Manages system-wide configuration stored in the `system_settings` table.
 * A short in-process cache (60 s TTL) prevents a DB round-trip on every GPS
 * ingest while still picking up configuration changes within a reasonable window.
 *
 * Classification: T1/T2 — system configuration, no PII.
 */
import prisma from '../prisma';

const CACHE_TTL_MS = 60_000; // 60 seconds

type GpsTrackingSource = 'DRIVER_APP' | 'DEDICATED_GPS';

let cachedSource: GpsTrackingSource | null = null;
let cacheExpiresAt = 0;

export const SystemSettingService = {
  /**
   * Returns the current GPS tracking source.
   * Result is cached for CACHE_TTL_MS to avoid per-request DB lookups.
   */
  async getGpsTrackingSource(): Promise<GpsTrackingSource> {
    const now = Date.now();
    if (cachedSource !== null && now < cacheExpiresAt) {
      return cachedSource;
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'GPS_TRACKING_SOURCE' },
    });

    cachedSource = (setting?.value as GpsTrackingSource | undefined) ?? 'DRIVER_APP';
    cacheExpiresAt = now + CACHE_TTL_MS;
    return cachedSource;
  },

  /**
   * Updates the GPS tracking source and immediately refreshes the cache.
   * updatedBy should be the Super Admin's user ID (never a name or email).
   */
  async setGpsTrackingSource(source: GpsTrackingSource, updatedBy: string): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key: 'GPS_TRACKING_SOURCE' },
      update: { value: source, updatedBy },
      create: { key: 'GPS_TRACKING_SOURCE', value: source, updatedBy },
    });

    // Eagerly update the cache so callers see the change immediately
    cachedSource = source;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  },

  /** Force-clears the in-process cache. Useful in tests. */
  invalidateCache(): void {
    cachedSource = null;
    cacheExpiresAt = 0;
  },
};
