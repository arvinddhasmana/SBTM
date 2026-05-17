import { OsrmClient, StubOsrmClient } from './osrm-client';
import { HttpOsrmClient } from './http-osrm-client';

export const OSRM_CLIENT = Symbol('OSRM_CLIENT');

/**
 * OSRM provider. When `OSRM_BASE_URL` is set, returns the HTTP-backed client
 * (real road-snap against the `sbtm-osrm` container). Otherwise falls back to
 * `StubOsrmClient` (straight-line passthrough) so unit tests and local dev
 * keep working without an OSRM instance.
 *
 * Optional env:
 *   OSRM_PROFILE      — defaults to 'driving'
 *   OSRM_TIMEOUT_MS   — defaults to 10000
 */
export const osrmClientProvider = {
  provide: OSRM_CLIENT,
  useFactory: (): OsrmClient => {
    const baseUrl = process.env.OSRM_BASE_URL?.trim();
    if (!baseUrl) return new StubOsrmClient();
    const profile = process.env.OSRM_PROFILE?.trim() || 'driving';
    const timeoutMs = Number.parseInt(process.env.OSRM_TIMEOUT_MS ?? '', 10);
    return new HttpOsrmClient(
      baseUrl,
      profile,
      Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10_000,
    );
  },
};
