import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { GpsGateway } from './gps.gateway';
import { PresenceGateway } from './presence.gateway';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('routes')
export class RoutesController {
    constructor(
        private readonly gpsGateway: GpsGateway,
        private readonly presenceGateway: PresenceGateway,
    ) { }

    @Get(':routeId/live-location')
    @Roles('PARENT', 'DRIVER', 'ADMIN') // Example roles
    async getLiveLocation(@Param('routeId') routeId: string) {
        return this.gpsGateway.getLiveLocation(routeId);
    }

    @Get(':routeId/history')
    @Roles('ADMIN', 'DRIVER') // Example roles
    async getHistory(@Param('routeId') routeId: string, @Query('from') from: string, @Query('to') to: string) {
        return this.gpsGateway.getHistory(routeId, from, to);
    }

    @Get(':routeId/students')
    @Roles('DRIVER', 'ADMIN')
    async getRouteStudents(@Param('routeId') routeId: string) {
        return this.presenceGateway.getRouteStudents(routeId);
    }
}
