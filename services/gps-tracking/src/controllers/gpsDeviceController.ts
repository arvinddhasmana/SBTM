/**
 * GPS Device Ingestion Controller
 *
 * Handles location submissions from dedicated hardware GPS devices.
 * Authentication: device Bearer token (NOT the internal service JWT).
 *
 * Route: POST /api/v1/device-locations
 *
 * Security model:
 *   - The device sends Authorization: Bearer <64-char-hex-token>
 *   - The token is validated against gps_device_tokens
 *   - vehicleId and schoolId come from the token record — never from the body
 *   - The endpoint only accepts submissions when GPS_TRACKING_SOURCE = DEDICATED_GPS
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import { GpsDeviceTokenService } from '../services/gpsDeviceTokenService';
import { SystemSettingService } from '../services/systemSettingService';
import { LocationService } from '../services/locationService';

const locationService = new LocationService();

const deviceLocationSchema = z.object({
  timestamp: z.string().datetime(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speedKph: z.number().min(0).optional(),
  headingDeg: z.number().min(0).max(360).optional(),
  accuracyMeters: z.number().min(0).optional(),
});

/**
 * POST /api/v1/device-locations
 *
 * Accepts a GPS position update from a dedicated hardware device.
 * Enforces GPS source mode, validates the device token, resolves the
 * active route, and delegates to LocationService for ingestion.
 */
export const ingestDeviceLocation = async (req: Request, res: Response): Promise<void> => {
  // ── 1. Validate GPS source mode ──────────────────────────────────────────
  const source = await SystemSettingService.getGpsTrackingSource();
  if (source !== 'DEDICATED_GPS') {
    res.status(422).json({
      error: 'GPS tracking source is set to DRIVER_APP. Dedicated device submissions are disabled.',
    });
    return;
  }

  // ── 2. Extract and validate device Bearer token ───────────────────────────
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }
  const rawToken = authHeader.slice('Bearer '.length).trim();

  const tokenCtx = await GpsDeviceTokenService.validateToken(rawToken);
  if (!tokenCtx) {
    res.status(401).json({ error: 'Invalid or inactive device token' });
    return;
  }

  // ── 3. Validate request body ──────────────────────────────────────────────
  const parsed = deviceLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const payload = parsed.data;

  // ── 4. Resolve active route for vehicle ───────────────────────────────────
  const routeId = await GpsDeviceTokenService.resolveActiveRouteId(tokenCtx.vehicleId);
  if (!routeId) {
    // Vehicle is not currently on a route — position ignored, not an error
    res.status(422).json({
      error: 'No active route found for this vehicle. The device GPS position was not recorded.',
    });
    return;
  }

  // ── 5. Ingest via the shared LocationService pipeline ────────────────────
  try {
    await locationService.ingestLocation({
      schoolId: tokenCtx.schoolId,
      vehicleId: tokenCtx.vehicleId,
      routeId,
      timestamp: payload.timestamp,
      lat: payload.lat,
      lng: payload.lng,
      speedKph: payload.speedKph,
      headingDeg: payload.headingDeg,
      accuracyMeters: payload.accuracyMeters,
    });

    // Log IDs and event type only — no T4 data
    console.info('Device GPS location ingested', {
      vehicleId: tokenCtx.vehicleId,
      schoolId: tokenCtx.schoolId,
      routeId,
      tokenId: tokenCtx.tokenId,
    });

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to ingest device location', {
      vehicleId: tokenCtx.vehicleId,
      tokenId: tokenCtx.tokenId,
      error,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
