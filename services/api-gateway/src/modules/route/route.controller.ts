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
  findAll(@Req() req: any) {
    const schoolId = resolveSchoolId(req);
    return this.routeService.findAll(schoolId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    if (id.startsWith('ROUTE-')) {
      return res.redirect(`/api/v1/routes/reference/${id}`);
    }
    const schoolId = resolveSchoolId(req);
    this.routeService
      .findOne(id, schoolId)
      .then((data) => res.json(data))
      .catch((err) => {
        const status = err.getStatus ? err.getStatus() : 500;
        res.status(status).json({ message: err.message, error: err.name });
      });
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
