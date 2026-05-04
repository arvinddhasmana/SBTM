import { Request, Response } from 'express';
import { z } from 'zod';
import { LocationService } from '../services/locationService';
import { SystemSettingService } from '../services/systemSettingService';

const locationService = new LocationService();

const locationSchema = z.object({
  schoolId: z.string().min(1),
  vehicleId: z.string().min(1),
  routeId: z.string().min(1),
  timestamp: z.string().datetime(),
  // Validate coordinate ranges per PostGIS/WGS84 rules
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speedKph: z.number().min(0).optional(),
  headingDeg: z.number().min(0).max(360).optional(),
  accuracyMeters: z.number().min(0).optional(),
});

export const ingestLocation = async (req: Request, res: any) => {
  try {
    // Enforce GPS tracking source: reject driver-app submissions when
    // the system is configured to use dedicated hardware GPS devices.
    const source = await SystemSettingService.getGpsTrackingSource();
    if (source === 'DEDICATED_GPS') {
      res.status(422).json({
        error:
          'GPS tracking source is set to DEDICATED_GPS. Driver app location submissions are disabled.',
      });
      return;
    }

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
    const schoolId = req.query.schoolId as string | undefined;
    const location = await locationService.getLatestLocation(routeId, schoolId);

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
    const schoolId = req.query.schoolId as string | undefined;
    const history = await locationService.getRouteHistory(routeId, schoolId);
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
