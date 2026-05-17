import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from '../gtfs/entities/route.entity';
import { Trip } from '../gtfs/entities/trip.entity';
import { Shape } from '../gtfs/entities/shape.entity';
import { CreateRouteDto, UpdateRouteDto } from './dto/route.dto';
import { RouteChangeNotifierService } from '../gateway/services/route-change-notifier.service';

/**
 * v2 RouteService — backed by GTFS `routes` + `trips` + `stop_times` + `stops` + `shapes`.
 *
 * The v1 Route had `polyline` + `route_stops` rows; v2 splits that:
 *   - Geometry lives in `shapes` (rows keyed by shape_id + shape_pt_sequence).
 *   - Stop ordering lives in `stop_times` keyed by trip_id.
 *   - schoolId scoping is via `routes.stx_school_id`.
 *
 * Most write paths in this service are still TODO — Phase B left them as stubs so the
 * compile passes. Read paths exist where the v2 mapping is trivial.
 */
@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    @InjectRepository(Shape)
    private readonly shapeRepository: Repository<Shape>,
    private readonly routeChangeNotifier: RouteChangeNotifierService,
  ) {}

  /**
   * TODO(phase-B): wire to v2 — creating a route now requires assembling routes + trips +
   * stop_times + shapes within a single transaction. The current DTO carries the v1 shape
   * (single startTime, single vehicleId) which doesn't map 1:1 to GTFS (a route can have
   * many trips, and vehicle/driver assignment lives on `stx_runs`). Needs a design decision
   * on whether the public POST /routes endpoint creates a Route + a single canonical Trip,
   * or whether it switches to a multi-trip payload.
   */
  async create(_createRouteDto: CreateRouteDto): Promise<Route> {
    throw new NotImplementedException(
      'RouteService.create is not yet wired to the v2 GTFS schema',
    );
  }

  async findAll(schoolId: string): Promise<Route[]> {
    return this.routeRepository.find({
      where: { stxSchoolId: schoolId },
    });
  }

  async findOne(id: string, schoolId: string): Promise<Route> {
    const route = await this.routeRepository.findOne({
      where: { routeId: id, stxSchoolId: schoolId },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    return route;
  }

  /**
   * Helper: load all shape points for a route via its trips. Routes don't carry a shape_id
   * directly — trips do. Returns the shape rows for the first trip's shape_id (a route is
   * generally one shape per direction, but a route may have multiple shapes if its trips
   * differ; callers needing per-trip geometry should query Trip → Shape directly).
   */
  async getShapeForRoute(routeId: string): Promise<Shape[]> {
    const trip = await this.tripRepository.findOne({
      where: { routeId },
    });
    if (!trip?.shapeId) return [];
    return this.shapeRepository.find({
      where: { shapeId: trip.shapeId },
      order: { shapePtSequence: 'ASC' },
    });
  }

  /**
   * TODO(phase-B): wire to v2 — updates now have to fan out to routes/trips/stop_times/shapes.
   */
  async update(
    _id: string,
    schoolId: string,
    _updateRouteDto: UpdateRouteDto,
  ): Promise<Route> {
    void this.routeChangeNotifier.notifyRouteChange(
      _id,
      'Route details updated',
      schoolId,
    );
    throw new NotImplementedException(
      'RouteService.update is not yet wired to the v2 GTFS schema',
    );
  }

  async remove(id: string, schoolId: string): Promise<void> {
    const route = await this.findOne(id, schoolId);
    await this.routeRepository.softRemove(route);
  }
}
