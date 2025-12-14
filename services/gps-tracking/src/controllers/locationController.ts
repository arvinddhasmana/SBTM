import { Request, Response } from 'express';
import { z } from 'zod';
import { LocationService } from '../services/locationService';

const locationService = new LocationService();

const locationSchema = z.object({
    vehicleId: z.string(),
    routeId: z.string(),
    timestamp: z.string().datetime(),
    lat: z.number(),
    lng: z.number(),
    speedKph: z.number().optional(),
    headingDeg: z.number().optional(),
    accuracyMeters: z.number().optional(),
});

export const ingestLocation = async (req: Request, res: any) => {
    try {
        const validatedData = locationSchema.parse(req.body);
        await locationService.ingestLocation(validatedData);
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

export const getLiveLocation = async (req: Request, res: any) => {
    try {
        const { routeId } = req.params;
        const location = await locationService.getLatestLocation(routeId);

        if (!location) {
            return res.status(404).json({ error: 'Location not found for this route' });
        }

        res.json(location);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getRouteHistory = async (req: Request, res: any) => {
    try {
        const { routeId } = req.params;
        const history = await locationService.getRouteHistory(routeId);
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
