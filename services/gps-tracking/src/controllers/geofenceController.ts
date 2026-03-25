import { Request, Response } from 'express';
import { z } from 'zod';
import { GeofenceService } from '../services/geofenceService';

const geofenceService = new GeofenceService();

const upsertGeofenceSchema = z.object({
    schoolId: z.string().min(1),
    routeId: z.string().min(1),
    corridorRadiusMeters: z.number().positive().optional(),
    stopProximityMeters: z.number().positive().optional(),
    deviationThresholdMeters: z.number().positive().optional(),
});

/**
 * PUT /api/v1/geofences
 * Create or update geofence thresholds for a route.
 * schoolId MUST come from the request body (proxied from gateway JWT context).
 * Routes belong to a school — frontend never passes a raw schoolId from user input.
 */
export const upsertGeofence = async (req: Request, res: Response): Promise<void> => {
    try {
        const dto = upsertGeofenceSchema.parse(req.body);
        const result = await geofenceService.upsert(dto);
        res.status(200).json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error('[geofence-controller] upsert failed', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

/**
 * GET /api/v1/routes/:routeId/geofence
 * Retrieve geofence configuration for a specific route.
 */
export const getGeofence = async (req: Request, res: Response): Promise<void> => {
    try {
        const { routeId } = req.params;
        const schoolId = req.query.schoolId as string | undefined;

        if (!schoolId) {
            res.status(400).json({ error: 'schoolId query param is required' });
            return;
        }

        const geofence = await geofenceService.findByRoute(routeId, schoolId);
        if (!geofence) {
            res.status(404).json({ error: 'Geofence not configured for this route' });
            return;
        }

        res.json(geofence);
    } catch (error) {
        console.error('[geofence-controller] getGeofence failed', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * GET /api/v1/routes/:routeId/deviations
 * Return recent deviation events for a route. Tenant-scoped.
 */
export const getDeviationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { routeId } = req.params;
        const schoolId = req.query.schoolId as string | undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

        if (!schoolId) {
            res.status(400).json({ error: 'schoolId query param is required' });
            return;
        }

        if (isNaN(limit) || limit < 1 || limit > 200) {
            res.status(400).json({ error: 'limit must be a number between 1 and 200' });
            return;
        }

        const history = await geofenceService.getDeviationHistory(routeId, schoolId, limit);
        res.json(history);
    } catch (error) {
        console.error('[geofence-controller] getDeviationHistory failed', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
