import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GpsGateway } from './gps.gateway';
import { PresenceGateway } from './presence.gateway';
import { AlertsGateway } from './alerts.gateway';
import { VideoGateway } from './video.gateway';
import { RoutesController } from './routes.controller';
import { AlertsController } from './alerts.controller';
import { EmergencyEventsController } from './emergency-events.controller';
import { VideoEventsController } from './video-events.controller';
import { StudentPresenceEventsController } from './student-presence-events.controller';

@Module({
    imports: [HttpModule],
    providers: [GpsGateway, PresenceGateway, AlertsGateway, VideoGateway],
    controllers: [
        RoutesController,
        AlertsController,
        EmergencyEventsController,
        VideoEventsController,
        StudentPresenceEventsController
    ],
})
export class GatewayModule { }
