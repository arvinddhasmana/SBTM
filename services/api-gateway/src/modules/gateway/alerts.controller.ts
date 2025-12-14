import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AlertsGateway } from './alerts.gateway';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('alerts')
export class AlertsController {
    constructor(private readonly alertsGateway: AlertsGateway) { }

    @Get('active')
    @Roles('ADMIN', 'DRIVER')
    async getActiveAlerts() {
        return this.alertsGateway.getActiveAlerts();
    }

    @Get(':id')
    @Roles('ADMIN')
    async getAlertById(@Param('id') id: string) {
        return this.alertsGateway.getAlertById(id);
    }
}
