import { Router } from 'express';
import type { Router as RouterType } from 'express';
import * as locationController from '../controllers/locationController';
import * as lifecycleController from '../controllers/lifecycleController';
import * as geofenceController from '../controllers/geofenceController';
import * as systemSettingController from '../controllers/systemSettingController';
import * as deviceTokenController from '../controllers/deviceTokenController';
import * as gpsDeviceController from '../controllers/gpsDeviceController';
import { internalServiceAuthMiddleware } from '../middleware/internal-service-auth.middleware';

// ── Internal service router ───────────────────────────────────────────────────
// All routes here are called by the API Gateway using a signed service JWT.
const router: RouterType = Router();
router.use(internalServiceAuthMiddleware);

// Location ingestion and query (driver app path)
router.post('/locations', locationController.ingestLocation);
router.get('/routes/:routeId/live-location', locationController.getLiveLocation);
router.get('/routes/:routeId/history', locationController.getRouteHistory);

// Route lifecycle
router.post('/routes/lifecycle', lifecycleController.recordLifecycleEvent);
router.get('/routes/:routeId/lifecycle', lifecycleController.getRouteLifecycle);

// Geofencing
router.put('/geofences', geofenceController.upsertGeofence);
router.get('/routes/:routeId/geofence', geofenceController.getGeofence);
router.get('/routes/:routeId/deviations', geofenceController.getDeviationHistory);

// System settings management (Super Admin via API gateway)
router.get('/system-settings/gps-source', systemSettingController.getGpsSource);
router.put('/system-settings/gps-source', systemSettingController.setGpsSource);

// GPS device token management (Super Admin via API gateway)
router.post('/device-tokens', deviceTokenController.createDeviceToken);
router.get('/device-tokens', deviceTokenController.listDeviceTokens);
router.delete('/device-tokens/:id', deviceTokenController.deleteDeviceToken);

// ── Device ingestion router ───────────────────────────────────────────────────
// This router handles GPS submissions from dedicated hardware devices.
// It uses device Bearer token authentication — NOT the internal service JWT.
// It is mounted separately in app.ts to bypass internalServiceAuthMiddleware.
export const deviceRouter: RouterType = Router();
deviceRouter.post('/device-locations', gpsDeviceController.ingestDeviceLocation);

export default router;
