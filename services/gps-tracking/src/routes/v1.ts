import { Router } from 'express';
import * as locationController from '../controllers/locationController';
import * as lifecycleController from '../controllers/lifecycleController';

const router = Router();

router.post('/locations', locationController.ingestLocation);
router.get('/routes/:routeId/live-location', locationController.getLiveLocation);
router.get('/routes/:routeId/history', locationController.getRouteHistory);
router.post('/routes/lifecycle', lifecycleController.recordLifecycleEvent);
router.get('/routes/:routeId/lifecycle', lifecycleController.getRouteLifecycle);

export default router;
