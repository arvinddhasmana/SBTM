import { Router } from 'express';
import * as locationController from '../controllers/locationController';

const router = Router();

router.post('/locations', locationController.ingestLocation);
router.get('/routes/:routeId/live-location', locationController.getLiveLocation);
router.get('/routes/:routeId/history', locationController.getRouteHistory);

export default router;
