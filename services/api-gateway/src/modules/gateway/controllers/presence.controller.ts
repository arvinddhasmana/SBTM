import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PresenceGatewayService, CreateStudentPresenceEventDto } from '../services/presence.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

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
}
