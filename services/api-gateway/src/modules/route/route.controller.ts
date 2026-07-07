import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { RouteService } from './route.service';
import { OptimizationService } from './optimization.service';
import {
  CreateRouteDto,
  UpdateRouteDto,
  CreateRouteStopDto,
} from './dto/route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@sbtm/common';
import { Roles, Role } from '@sbtm/common';
import { MultiTenancyGuard } from '../../common/guards/multi-tenancy.guard';
import { Route } from '../gtfs/entities/route.entity';

/**
 * v2 helper: derive the school scope from the JWT-attached user. SCHOOL_ADMIN's anchor
 * IS the school. For other roles, the school must be passed as a query param.
 * TODO(phase-B): widen to handle BOARD/STA admins fetching across multiple schools.
 */
function resolveSchoolId(req: any): string {
  if (req.user?.anchorKind === 'school' && req.user.anchorId) {
    return req.user.anchorId;
  }
  return req.query?.schoolId ?? '';
}

/** Map GTFS Route entity to the frontend-expected wire shape. */
function toFrontendRoute(r: Route) {
  return {
    id: r.routeId,
    name: r.routeLongName ?? r.routeShortName ?? r.routeId,
    schoolId: r.stxSchoolId,
    direction: (r.stxDirectionKind ?? 'am').toUpperCase() as 'AM' | 'PM',
    stops: [],
    status: 'active' as const,
    startTime: '',
    estimatedDuration: 0,
  };
}

@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard, MultiTenancyGuard)
export class RouteController {
  constructor(
    private readonly routeService: RouteService,
    private readonly optimizationService: OptimizationService,
  ) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.STA_ADMIN)
  create(@Body() createRouteDto: CreateRouteDto) {
    return this.routeService.create(createRouteDto);
  }

  @Get()
  async findAll(@Req() req: any) {
    const schoolId = resolveSchoolId(req);
    const routes = await this.routeService.findAll(schoolId);
    return Promise.all(
      routes.map(async (r) => {
        const base = toFrontendRoute(r);
        const stops = await this.routeService.getStopsForRoute(r.routeId);
        const fleet = await this.routeService.getFleetInfoForRoute(r.routeId);
        let startTime = '07:00';
        if (stops.length > 0 && stops[0].arrivalTime) {
          startTime = stops[0].arrivalTime.slice(0, 5);
        }
        return {
          ...base,
          stops,
          operatorCode: fleet.operatorCode,
          vehicleCode: fleet.vehicleCode,
          tripIds: fleet.tripIds,
          startTime,
        };
      }),
    );
  }

  @Get(':id/shape')
  async getShape(@Param('id') id: string, @Req() req: any) {
    const schoolId = resolveSchoolId(req);
    await this.routeService.findOne(id, schoolId);
    const shapes = await this.routeService.getShapeForRoute(id);
    return shapes.map((s) => ({
      lat: Number(s.shapePtLat),
      lon: Number(s.shapePtLon),
      sequence: Number(s.shapePtSequence),
      distTraveled: s.shapeDistTraveled ? Number(s.shapeDistTraveled) : null,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    if (id.startsWith('ROUTE-')) {
      return res.redirect(`/api/v1/routes/reference/${id}`);
    }
    const schoolId = resolveSchoolId(req);
    try {
      const route = await this.routeService.findOne(id, schoolId);
      const stops = await this.routeService.getStopsForRoute(id);
      const shapes = await this.routeService.getShapeForRoute(id);
      const path = shapes.map(
        (s) => [Number(s.shapePtLat), Number(s.shapePtLon)] as [number, number],
      );
      const vehicleId = await this.routeService.getVehicleIdForRoute(id);
      const fleet = await this.routeService.getFleetInfoForRoute(id);
      const base = toFrontendRoute(route);

      let startTime = '07:00';
      if (stops.length > 0 && stops[0].arrivalTime) {
        startTime = stops[0].arrivalTime.slice(0, 5);
      }

      res.json({
        ...base,
        stops,
        startTime,
        path,
        vehicleId,
        operatorCode: fleet.operatorCode,
        vehicleCode: fleet.vehicleCode,
        tripIds: fleet.tripIds,
      });
    } catch (err: any) {
      const status = err.getStatus ? err.getStatus() : 500;
      res.status(status).json({ message: err.message, error: err.name });
    }
  }

  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.STA_ADMIN)
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateRouteDto: UpdateRouteDto,
  ) {
    const schoolId = resolveSchoolId(req);
    return this.routeService.update(id, schoolId, updateRouteDto);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.STA_ADMIN)
  remove(@Param('id') id: string, @Req() req: any) {
    const schoolId = resolveSchoolId(req);
    return this.routeService.remove(id, schoolId);
  }

  @Post('optimize')
  @Roles(Role.SCHOOL_ADMIN, Role.STA_ADMIN)
  optimize(@Body() stops: CreateRouteStopDto[]) {
    return this.optimizationService.optimizeStops(stops);
  }

  @Post('snap-to-road')
  @Roles(Role.SCHOOL_ADMIN, Role.STA_ADMIN, Role.DRIVER)
  snapToRoad(@Body() waypoints: { lat: number; lng: number }[]) {
    return this.optimizationService.snapToRoad(waypoints);
  }
}
