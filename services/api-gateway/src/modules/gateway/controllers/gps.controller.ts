import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { GpsGatewayService, LocationHistoryQueryDto } from '../services/gps.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GpsController {
    constructor(private readonly gpsGatewayService: GpsGatewayService) { }

    @Get(':routeId/live-location')
    async getLiveLocation(
        @Param('routeId') routeId: string,
        @Request() req: { user: any },
    ) {
        return this.gpsGatewayService.getLiveLocation(routeId, req.user);
    }

    @Get(':routeId/history')
    async getLocationHistory(
        @Param('routeId') routeId: string,
        @Query() query: LocationHistoryQueryDto,
        @Request() req: { user: any },
    ) {
        return this.gpsGatewayService.getLocationHistory(routeId, query, req.user);
    }
}
