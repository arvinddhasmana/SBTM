import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AlertsGateway } from './alerts.gateway';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('emergency-events')
export class EmergencyEventsController {
    constructor(private readonly alertsGateway: AlertsGateway) { }

    @Post()
    @Roles('DRIVER', 'ADMIN')
    async createEmergencyEvent(@Body() event: any) {
        return this.alertsGateway.createEmergencyEvent(event);
    }
}
