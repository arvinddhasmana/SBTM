/**
 * GpsDeviceTokenService
 *
 * Validates incoming dedicated GPS hardware device tokens and resolves
 * the vehicle / school context from the token record.
 *
 * Authentication flow:
 *   1. Extract raw token from `Authorization: Bearer <token>` header.
 *   2. Look up the token in gps_device_tokens (unique index lookup).
 *   3. Reject if not found or is_active = false.
 *   4. Fire-and-forget update of last_seen_at for operational monitoring.
 *   5. Return { vehicleId, schoolId } for use by the ingestion pipeline.
 *
 * Classification: T2 — vehicle and school identifiers, no student PII.
 */
import prisma from '../prisma';

export interface DeviceTokenContext {
  tokenId: string;
  vehicleId: string;
  schoolId: string;
}

export const GpsDeviceTokenService = {
  /**
   * Validates a raw device token string.
   * Returns the associated context or null if the token is invalid/inactive.
   * Updates last_seen_at on each successful validation (fire-and-forget).
   */
  async validateToken(rawToken: string): Promise<DeviceTokenContext | null> {
    if (!rawToken || rawToken.length === 0) {
      return null;
    }

    const record = await prisma.gpsDeviceToken.findUnique({
      where: { token: rawToken },
      select: { id: true, vehicleId: true, schoolId: true, isActive: true },
    });

    if (!record || !record.isActive) {
      return null;
    }

    // Update last_seen_at asynchronously — do not block the ingestion path
    void prisma.gpsDeviceToken
      .update({
        where: { id: record.id },
        data: { lastSeenAt: new Date() },
      })
      .catch((err: unknown) => {
        // Non-fatal: last_seen_at is operational metadata only
        console.error('Failed to update device token last_seen_at', {
          tokenId: record.id,
          error: err,
        });
      });

    return {
      tokenId: record.id,
      vehicleId: record.vehicleId,
      schoolId: record.schoolId,
    };
  },

  /**
   * Resolves the active routeId for a vehicle by inspecting the most recent
   * lifecycle event per route. Returns null if the vehicle has no active route.
   *
   * A route is "active" when its most recent lifecycle event is NOT
   * `ROUTE_COMPLETED`.
   */
  async resolveActiveRouteId(vehicleId: string): Promise<string | null> {
    // Use a raw query to get the most recent event per route for this vehicle.
    // This mirrors the pattern used by the API gateway's getActiveRoutes method.
    const rows = await prisma.$queryRaw<Array<{ routeId: string; eventType: string }>>`
      SELECT DISTINCT ON (route_id)
        route_id AS "routeId",
        event_type AS "eventType"
      FROM route_lifecycle_events
      WHERE vehicle_id = ${vehicleId}
      ORDER BY route_id, timestamp DESC
    `;

    const activeRoute = rows.find((r) => r.eventType !== 'ROUTE_COMPLETED');
    return activeRoute?.routeId ?? null;
  },

  /** Creates a new device token record. Returns the raw token (shown once). */
  async createToken(params: {
    vehicleId: string;
    schoolId: string;
    description?: string;
    rawToken: string;
  }): Promise<{ id: string; maskedToken: string }> {
    const record = await prisma.gpsDeviceToken.create({
      data: {
        token: params.rawToken,
        vehicleId: params.vehicleId,
        schoolId: params.schoolId,
        description: params.description ?? null,
        isActive: true,
      },
    });

    return {
      id: record.id,
      maskedToken: `...${params.rawToken.slice(-8)}`,
    };
  },

  /** Lists tokens for a school. Token value is always masked. */
  async listTokensBySchool(schoolId: string): Promise<
    Array<{
      id: string;
      vehicleId: string;
      schoolId: string;
      description: string | null;
      isActive: boolean;
      createdAt: Date;
      lastSeenAt: Date | null;
      maskedToken: string;
    }>
  > {
    const records = await prisma.gpsDeviceToken.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        vehicleId: true,
        schoolId: true,
        description: true,
        isActive: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });

    return records.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      schoolId: r.schoolId,
      description: r.description,
      isActive: r.isActive,
      createdAt: r.createdAt,
      lastSeenAt: r.lastSeenAt,
      maskedToken: `...${r.token.slice(-8)}`,
    }));
  },

  /** Hard-deletes a device token record by id. */
  async deleteToken(id: string): Promise<void> {
    await prisma.gpsDeviceToken.delete({ where: { id } });
  },
};
