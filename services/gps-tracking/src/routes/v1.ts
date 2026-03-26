import { Router } from 'express';
import * as locationController from '../controllers/locationController';
import * as lifecycleController from '../controllers/lifecycleController';
import * as geofenceController from '../controllers/geofenceController';
import { internalServiceAuthMiddleware } from '../middleware/internal-service-auth.middleware';

const router = Router();

// All routes in this service are internal — they are only called by the API Gateway.
// The internalServiceAuthMiddleware validates the service JWT issued by the API Gateway.
router.use(internalServiceAuthMiddleware);

router.post('/locations', locationController.ingestLocation);
router.get('/routes/:routeId/live-location', locationController.getLiveLocation);
router.get('/routes/:routeId/history', locationController.getRouteHistory);
router.post('/routes/lifecycle', lifecycleController.recordLifecycleEvent);
router.get('/routes/:routeId/lifecycle', lifecycleController.getRouteLifecycle);

// Geofencing endpoints
router.put('/geofences', geofenceController.upsertGeofence);
router.get('/routes/:routeId/geofence', geofenceController.getGeofence);
router.get('/routes/:routeId/deviations', geofenceController.getDeviationHistory);

export default router;
