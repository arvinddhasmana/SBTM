import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PresenceGatewayService } from '../services/presence.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Role } from '../../../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PresenceController {
    constructor(private readonly presenceGatewayService: PresenceGatewayService) { }

    @Get('presence/stats')
    async getStats(@Request() req: { user: any }) {
        return this.presenceGatewayService.getStats(req.user);
    }

    @Get('presence/events')
    async getEvents(
        @Query() query: any,
        @Request() req: { user: any },
    ) {
        return this.presenceGatewayService.getEvents(query, req.user);
    }

    @Post('presence-events')
    @Roles(Role.DRIVER, Role.ADMIN)
    async processEvents(@Body() dto: any) {
        return this.presenceGatewayService.processEvents(dto);
    }

    @Post('student-presence-events')
    @Roles(Role.DRIVER, Role.ADMIN)
    async processEventsAlt(@Body() dto: any) {
        return this.presenceGatewayService.processEvents(dto);
    }

    @Post('student-presence-events/manual')
    @Roles(Role.DRIVER, Role.ADMIN)
    async manualOverride(@Body() dto: any) {
        return this.presenceGatewayService.manualOverride(dto);
    }
}
