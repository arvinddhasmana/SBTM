/**
 * System Setting Controller (internal service auth)
 *
 * Provides GET/PUT for the GPS tracking source setting.
 * These endpoints are called by the API gateway on behalf of Super Admin users.
 * Protected by the internalServiceAuthMiddleware — not directly reachable by clients.
 *
 * Routes (mounted on /api/v1):
 *   GET  /system-settings/gps-source
 *   PUT  /system-settings/gps-source
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import { SystemSettingService } from '../services/systemSettingService';

const setGpsSourceSchema = z.object({
  source: z.enum(['DRIVER_APP', 'DEDICATED_GPS']),
  updatedBy: z.string().min(1),
});

export const getGpsSource = async (_req: Request, res: Response): Promise<void> => {
  try {
    const source = await SystemSettingService.getGpsTrackingSource();
    res.json({ source });
  } catch (error) {
    console.error('Failed to get GPS tracking source', { error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const setGpsSource = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = setGpsSourceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }

    const { source, updatedBy } = parsed.data;
    await SystemSettingService.setGpsTrackingSource(source, updatedBy);

    // Log the change with IDs only — no PII (updatedBy is a user ID)
    console.info('GPS tracking source updated', { source, updatedBy });

    res.json({ source });
  } catch (error) {
    console.error('Failed to set GPS tracking source', { error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
