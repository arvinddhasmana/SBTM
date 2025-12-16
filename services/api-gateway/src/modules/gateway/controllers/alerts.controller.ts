import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AlertsGatewayService, CreateEmergencyEventDto } from '../services/alerts.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Role } from '../../../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
    constructor(private readonly alertsGatewayService: AlertsGatewayService) { }

    @Get('alerts/active')
    async getActiveAlerts() {
        return this.alertsGatewayService.getActiveAlerts();
    }

    @Get('alerts/:id')
    async getAlertById(@Param('id') id: string) {
        return this.alertsGatewayService.getAlertById(id);
    }

    @Post('emergency-events')
    @Roles(Role.DRIVER, Role.ADMIN)
    async createEmergencyEvent(@Body() dto: CreateEmergencyEventDto) {
        return this.alertsGatewayService.createEmergencyEvent(dto);
    }
}
