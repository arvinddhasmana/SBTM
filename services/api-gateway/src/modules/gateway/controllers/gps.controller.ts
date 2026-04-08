import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Post,
  Body,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  GpsGatewayService,
  LocationHistoryQueryDto,
  CreateLocationDto,
  RouteLifecycleEventDto,
} from '../services/gps.gateway.service';
import { GpsSseService } from '../services/gps-sse.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GpsRouteAccessGuard } from '../guards/gps-route-access.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';

@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GpsController {
  constructor(
    private readonly gpsGatewayService: GpsGatewayService,
    private readonly gpsSseService: GpsSseService,
  ) {}

  @Get('active')
  async getActiveRoutes(@Request() req: { user: any }) {
    return this.gpsGatewayService.getActiveRoutes(req.user);
  }

  @Get('reference/:routeId')
  async getReferenceRouteById(
    @Param('routeId') routeId: string,
    @Request() req: { user: any },
  ) {
    return this.gpsGatewayService.getReferenceRouteById(routeId, req.user);
  }

  @Get('locations')
  async getAllLiveLocations(@Request() req: { user: any }) {
    return this.gpsGatewayService.getAllLiveLocations(req.user);
  }

  @Get(':routeId/live-location')
  async getLiveLocation(
    @Param('routeId') routeId: string,
    @Request() req: { user: any },
  ) {
    return this.gpsGatewayService.getLiveLocation(routeId, req.user);
  }

  /**
   * SSE stream: pushes GPS location updates in real-time for the given route.
   *
   * GpsRouteAccessGuard enforces per-route ownership/tenant checks BEFORE
   * NestJS commits the `text/event-stream` response headers, ensuring a proper
   * HTTP 403 is returned for unauthorised callers rather than an SSE error
   * event embedded in a 200 response.
   */
  @Sse(':routeId/location/stream')
  @Roles(
    Role.PARENT,
    Role.ADMIN,
    Role.OSTA_ADMIN,
    Role.BOARD_ADMIN,
    Role.SCHOOL_ADMIN,
    Role.DRIVER,
  )
  @UseGuards(GpsRouteAccessGuard)
  locationStream(@Param('routeId') routeId: string): Observable<MessageEvent> {
    return this.gpsSseService.getStream(routeId);
  }

  @Get(':routeId/history')
  async getLocationHistory(
    @Param('routeId') routeId: string,
    @Query() query: LocationHistoryQueryDto,
    @Request() req: { user: any },
  ) {
    return this.gpsGatewayService.getLocationHistory(routeId, query, req.user);
  }

  @Post('locations')
  async ingestLocation(
    @Body() dto: CreateLocationDto,
    @Request() req: { user: any },
  ) {
    return this.gpsGatewayService.ingestLocation(dto, req.user);
  }

  /**
   * Records a route lifecycle event (start, stop progression, completion).
   * schoolId is derived from the authenticated JWT – never trusted from the body.
   */
  @Post('lifecycle-events')
  @Roles(Role.DRIVER, Role.ADMIN)
  async recordLifecycleEvent(
    @Body() dto: RouteLifecycleEventDto,
    @Request() req: { user: any },
  ) {
    return this.gpsGatewayService.recordRouteLifecycleEvent(dto, req.user);
  }

  @Get(':routeId/students')
  @Roles(Role.OSTA_ADMIN, Role.ADMIN, Role.SCHOOL_ADMIN)
  async getRouteStudents(
    @Param('routeId') routeId: string,
    @Request() req: { user: any },
  ) {
    return this.gpsGatewayService.getRouteStudents(routeId, req.user);
  }
}
