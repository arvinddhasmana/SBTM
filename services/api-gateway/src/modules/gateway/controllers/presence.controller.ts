import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import {
    PresenceGatewayService,
    CreateStudentPresenceEventDto,
    ProcessBleDetectionsDto,
} from '../services/presence.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Role } from '../../../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PresenceController {
    constructor(private readonly presenceGatewayService: PresenceGatewayService) { }

    @Get('routes/:routeId/students')
    async getStudentsForRoute(
        @Param('routeId') routeId: string,
        @Request() req: { user: any },
    ) {
        return this.presenceGatewayService.getStudentsForRoute(routeId, req.user);
    }

    @Post('student-presence-events')
    async createStudentPresenceEvent(
        @Body() dto: CreateStudentPresenceEventDto,
        @Request() req: { user: any },
    ) {
        return this.presenceGatewayService.createStudentPresenceEvent(dto, req.user);
    }

    /**
     * Accepts batched BLE SmartTag detections from driver app.
     * schoolId is derived from the authenticated user – never trusted from the request body.
     */
    @Post('presence-events')
    @Roles(Role.DRIVER, Role.ADMIN)
    async processBleDetections(
        @Body() dto: ProcessBleDetectionsDto,
        @Request() req: { user: any },
    ) {
        return this.presenceGatewayService.processBleDetections(dto, req.user);
    }
}
