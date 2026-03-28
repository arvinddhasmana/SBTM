import { Controller, Get, Post, Param, Body, UseGuards, Request, Query, Patch } from '@nestjs/common';
import { AlertsGatewayService, CreateEmergencyEventDto } from '../services/alerts.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Role } from '../../../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
    constructor(private readonly alertsGatewayService: AlertsGatewayService) { }

    @Get('alerts')
    async getAllAlerts(
        @Request() req: { user: any },
        @Query('schoolId') schoolId?: string,
    ) {
        const user = req.user;
        const filterSchoolId = user.role === Role.OSTA_ADMIN ? schoolId : user.schoolId;
        return this.alertsGatewayService.getAllAlerts(filterSchoolId);
    }

    @Get('alerts/active')
    async getActiveAlerts(
        @Request() req: { user: any },
        @Query('schoolId') schoolId?: string,
    ) {
        const user = req.user;
        const filterSchoolId = user.role === Role.OSTA_ADMIN ? schoolId : user.schoolId;
        return this.alertsGatewayService.getActiveAlerts(filterSchoolId);
    }

    @Patch('alerts/:id/resolve')
    @Roles(Role.ADMIN, Role.SCHOOL_ADMIN)
    async resolveAlert(@Param('id') id: string) {
        return this.alertsGatewayService.resolveAlert(id);
    }

    @Get('alerts/:id')
    async getAlertById(@Param('id') id: string) {
        return this.alertsGatewayService.getAlertById(id);
    }

    @Post('emergency-events')
    @Roles(Role.DRIVER, Role.ADMIN)
    async createEmergencyEvent(
        @Body() dto: CreateEmergencyEventDto,
        @Request() req: { user: any },
    ) {
        const user = req.user;
        const schoolId = user.schoolId;
        return this.alertsGatewayService.createEmergencyEvent({
            ...dto,
            schoolId,
            driverId: dto.driverId || user.driverId || user.id,
        });
    }
}
