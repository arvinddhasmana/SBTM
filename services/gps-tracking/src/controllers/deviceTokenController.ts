/**
 * Device Token Management Controller (internal service auth)
 *
 * CRUD endpoints for GPS hardware device tokens.
 * Protected by internalServiceAuthMiddleware — only accessible from the API gateway.
 *
 * Routes (mounted on /api/v1):
 *   POST   /device-tokens         — create a new token
 *   GET    /device-tokens         — list tokens for a school (masked)
 *   DELETE /device-tokens/:id     — hard-delete a token
 *
 * The raw token value is returned ONLY in the POST response (create).
 * All list responses mask the token to its last 8 characters.
 *
 * Classification: T2 — vehicleId and schoolId are vehicle/tenant metadata.
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { GpsDeviceTokenService } from '../services/gpsDeviceTokenService';

const createTokenSchema = z.object({
  vehicleId: z.string().min(1),
  schoolId: z.string().min(1),
  description: z.string().max(200).optional(),
});

const listTokensSchema = z.object({
  schoolId: z.string().min(1),
});

/**
 * POST /api/v1/device-tokens
 * Creates a new GPS device token. The raw token is returned once only.
 */
export const createDeviceToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }

    const { vehicleId, schoolId, description } = parsed.data;

    // Generate 32 bytes of CSPRNG → 64-char hex string (256 bits entropy)
    const rawToken = crypto.randomBytes(32).toString('hex');

    const { id, maskedToken } = await GpsDeviceTokenService.createToken({
      vehicleId,
      schoolId,
      description,
      rawToken,
    });

    console.info('GPS device token created', {
      tokenId: id,
      vehicleId,
      schoolId,
    });

    // Return the raw token once — it cannot be retrieved again
    res.status(201).json({
      id,
      token: rawToken,
      maskedToken,
      vehicleId,
      schoolId,
      description: description ?? null,
    });
  } catch (error) {
    console.error('Failed to create device token', { error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/v1/device-tokens?schoolId=<id>
 * Lists all device tokens for a school. Token values are masked.
 */
export const listDeviceTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = listTokensSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }

    const tokens = await GpsDeviceTokenService.listTokensBySchool(parsed.data.schoolId);
    res.json(tokens);
  } catch (error) {
    console.error('Failed to list device tokens', { error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/v1/device-tokens/:id
 * Hard-deletes a device token. The token immediately becomes invalid.
 */
export const deleteDeviceToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || id.length === 0) {
      res.status(400).json({ error: 'Token ID is required' });
      return;
    }

    await GpsDeviceTokenService.deleteToken(id);

    console.info('GPS device token deleted', { tokenId: id });

    res.status(204).send();
  } catch (error) {
    // Prisma throws P2025 when the record is not found
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      res.status(404).json({ error: 'Device token not found' });
      return;
    }
    console.error('Failed to delete device token', { error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
