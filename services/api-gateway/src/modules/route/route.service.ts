import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Route, ShapeSource } from '../gtfs/entities/route.entity';
import { Trip } from '../gtfs/entities/trip.entity';
import { Shape } from '../gtfs/entities/shape.entity';
import { StopTime } from '../gtfs/entities/stop-time.entity';
import { Stop, StopKind } from '../gtfs/entities/stop.entity';
import { Board } from '../organization/entities/board.entity';
import { School } from '../organization/entities/school.entity';
import {
  CreateRouteDto,
  CreateRouteStopDto,
  CreateTripDto,
  ShapePointDto,
  UpdateRouteDto,
} from './dto/route.dto';
import { RouteChangeNotifierService } from '../gateway/services/route-change-notifier.service';

/** Default everyday Mon-Fri service synthesised when no `serviceId` is supplied. */
const DEFAULT_SERVICE_ID = 'SVC-WEEKDAY';

/** Default per-stop dwell when a CreateTripDto doesn't model arrival/departure deltas. */
const DEFAULT_DWELL_SECONDS = 30;

/** Default seconds between successive stops when computing stop_times from a startTime. */
const DEFAULT_INTER_STOP_SECONDS = 120;

/**
 * v2 RouteService — backed by GTFS `routes` + `trips` + `stop_times` + `stops` + `shapes`.
 *
 * v1 had `route.polyline` + `route_stops`; v2 normalises geometry into `shapes` and
 * ordering into `stop_times` keyed by trip. A POST /routes therefore writes 1 route
 * row + N trips + N×M stop_times + (optionally) a shape's worth of rows — all in one
 * transaction so a partial write can never leave a route without its trips.
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
    private readonly dataSource: DataSource,
    private readonly routeChangeNotifier: RouteChangeNotifierService,
  ) {}

  async create(dto: CreateRouteDto): Promise<Route> {
    const trips = this.resolveTrips(dto);
    const stops = dto.stops ?? [];
    if (stops.length === 0) {
      throw new BadRequestException(
        'A v2 route requires at least one stop (school stop + N pickup stops).',
      );
    }

    const staId = await this.resolveStaIdForSchool(dto.schoolId);
    const routeId = `R-${randomUUID().slice(0, 8)}`;
    const shapeId = await this.materializeShapePlan(dto);

    const persisted = await this.dataSource.transaction(async (tx) => {
      const route = await tx.getRepository(Route).save({
        routeId,
        agencyId: null,
        routeShortName: dto.name,
        routeLongName: dto.name,
        routeType: 712,
        routeColor: null,
        routeTextColor: null,
        stxStaId: staId,
        stxSchoolId: dto.schoolId,
        stxDirectionKind: dto.direction,
        stxShapeSource: shapeId
          ? dto.shapeId
            ? ShapeSource.STA_IMPORT
            : ShapeSource.STA_ADMIN_EDITED
          : ShapeSource.SBTM_GENERATED,
      } as Route);

      if (dto.shapePoints && dto.shapePoints.length > 0 && shapeId) {
        await this.writeShapePoints(tx, shapeId, dto.shapePoints);
      }

      const resolvedStops = await this.resolveStops(tx, dto.schoolId, stops);

      for (let i = 0; i < trips.length; i++) {
        const trip = trips[i];
        const tripId = `T-${routeId}-${i + 1}`;
        await tx.getRepository(Trip).save({
          tripId,
          routeId,
          serviceId: trip.serviceId,
          shapeId: shapeId ?? null,
          tripHeadsign: trip.headsign ?? dto.name,
          directionId: trip.directionId ?? (dto.direction === 'pm' ? 1 : 0),
          blockId: null,
          stxRunId: null,
        } as Trip);
        await this.writeStopTimes(tx, tripId, trip.startTime, resolvedStops);
      }

      return route;
    });

    return persisted;
  }

  async findAll(schoolId: string): Promise<Route[]> {
    if (!schoolId) {
      return this.routeRepository.find();
    }
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
   * directly — trips do. Returns the shape rows for the first trip's shape_id.
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
   * Replace-in-place update: mutates the routes row, then (if the payload supplies
   * stops or trips) deletes and re-creates the dependent stop_times / trips / shape
   * rows in a single transaction. A partial payload (e.g. just `name`) only touches
   * the routes row.
   */
  async update(
    id: string,
    schoolId: string,
    dto: UpdateRouteDto,
  ): Promise<Route> {
    const existing = await this.findOne(id, schoolId);

    const updated = await this.dataSource.transaction(async (tx) => {
      const routeRepo = tx.getRepository(Route);
      const patch: Partial<Route> = {};
      if (dto.name) {
        patch.routeShortName = dto.name;
        patch.routeLongName = dto.name;
      }
      if (dto.direction) patch.stxDirectionKind = dto.direction;
      if (Object.keys(patch).length > 0) {
        await routeRepo.update({ routeId: id }, patch);
      }

      const wantsShapeRewrite =
        (dto.shapePoints && dto.shapePoints.length > 0) || !!dto.shapeId;
      const wantsTripRewrite =
        (dto.trips && dto.trips.length > 0) ||
        (dto.stops && dto.stops.length > 0) ||
        !!dto.startTime;

      let nextShapeId: string | null = null;
      if (wantsShapeRewrite) {
        nextShapeId =
          dto.shapeId ??
          (dto.shapePoints && dto.shapePoints.length > 0
            ? `SHP-${randomUUID().slice(0, 8)}`
            : null);
        if (
          nextShapeId &&
          dto.shapePoints &&
          dto.shapePoints.length > 0 &&
          !dto.shapeId
        ) {
          await this.writeShapePoints(tx, nextShapeId, dto.shapePoints);
        }
        await routeRepo.update(
          { routeId: id },
          {
            stxShapeSource: dto.shapeId
              ? ShapeSource.STA_IMPORT
              : ShapeSource.STA_ADMIN_EDITED,
          },
        );
      }

      if (wantsTripRewrite) {
        const trips = this.resolveTrips({
          ...dto,
          // resolveTrips needs a startTime to fall back to if `trips` is empty
          startTime: dto.startTime ?? '07:00',
          direction: dto.direction ?? existing.stxDirectionKind,
        } as CreateRouteDto);

        const stopsForRewrite = dto.stops ?? [];
        if (stopsForRewrite.length === 0) {
          throw new BadRequestException(
            'Updating trips/startTime requires the full stop list in the same payload.',
          );
        }
        const resolvedStops = await this.resolveStops(
          tx,
          schoolId,
          stopsForRewrite,
        );

        // Wipe existing stop_times for this route's trips, then trips, then re-create.
        await tx.query(
          `DELETE FROM stop_times WHERE trip_id IN (SELECT trip_id FROM trips WHERE route_id = $1)`,
          [id],
        );
        await tx.getRepository(Trip).delete({ routeId: id });

        for (let i = 0; i < trips.length; i++) {
          const trip = trips[i];
          const tripId = `T-${id}-${i + 1}`;
          await tx.getRepository(Trip).save({
            tripId,
            routeId: id,
            serviceId: trip.serviceId,
            shapeId: nextShapeId ?? null,
            tripHeadsign: trip.headsign ?? existing.routeLongName ?? id,
            directionId:
              trip.directionId ?? (existing.stxDirectionKind === 'pm' ? 1 : 0),
            blockId: null,
            stxRunId: null,
          } as Trip);
          await this.writeStopTimes(tx, tripId, trip.startTime, resolvedStops);
        }
      }

      return tx
        .getRepository(Route)
        .findOneOrFail({ where: { routeId: id, stxSchoolId: schoolId } });
    });

    void this.routeChangeNotifier.notifyRouteChange(
      id,
      'Route details updated',
      schoolId,
    );

    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    const route = await this.findOne(id, schoolId);
    await this.routeRepository.softRemove(route);
  }

  // ---------------------------------------------------------------------------
  // private helpers
  // ---------------------------------------------------------------------------

  private resolveTrips(dto: CreateRouteDto): CreateTripDto[] {
    if (dto.trips && dto.trips.length > 0) {
      return dto.trips;
    }
    if (!dto.startTime) {
      throw new BadRequestException(
        'CreateRouteDto requires either `trips[]` or a top-level `startTime`.',
      );
    }
    return [
      {
        serviceId: DEFAULT_SERVICE_ID,
        startTime: dto.startTime,
        headsign: dto.name,
        directionId: dto.direction === 'pm' ? 1 : 0,
      },
    ];
  }

  /**
   * Decide whether a route is being created with a shape and which id to use:
   * - explicit `shapeId` → reuse, do not write shape points
   * - `shapePoints[]`    → mint a new shape_id, will be written by the caller
   * - neither            → no shape; caller flags shape_source = SBTM_GENERATED so an
   *                        async OSRM fallback worker can populate it later.
   */
  private async materializeShapePlan(
    dto: CreateRouteDto,
  ): Promise<string | null> {
    if (dto.shapeId) return dto.shapeId;
    if (dto.shapePoints && dto.shapePoints.length > 0) {
      return `SHP-${randomUUID().slice(0, 8)}`;
    }
    return null;
  }

  private async writeShapePoints(
    tx: EntityManager,
    shapeId: string,
    points: ShapePointDto[],
  ): Promise<void> {
    const rows = points.map((p) => ({
      shapeId,
      shapePtLat: p.lat,
      shapePtLon: p.lon,
      shapePtSequence: p.sequence,
      shapeDistTraveled: p.distTraveled ?? null,
    }));
    await tx.getRepository(Shape).save(rows as Shape[]);
  }

  /**
   * Walks the dto stops in order. For each stop:
   *   - if `stopId` (or v1-compat `id`) refers to an existing stops row → reuse it
   *   - otherwise → create a new pickup stop scoped to the route's school, parsing
   *     lat/lon from the WKT `POINT(lng lat)` location string.
   * Returns the stops in sequence order so stop_times can be written 1:1.
   */
  private async resolveStops(
    tx: EntityManager,
    schoolId: string,
    stops: CreateRouteStopDto[],
  ): Promise<Array<{ stopId: string; sequence: number }>> {
    const ordered = [...stops].sort((a, b) => a.sequence - b.sequence);
    const stopRepo = tx.getRepository(Stop);
    const resolved: Array<{ stopId: string; sequence: number }> = [];

    for (const s of ordered) {
      const existingId = s.stopId ?? s.id;
      if (existingId) {
        const found = await stopRepo.findOne({ where: { stopId: existingId } });
        if (!found) {
          throw new BadRequestException(
            `Stop ${existingId} referenced but not found.`,
          );
        }
        resolved.push({ stopId: existingId, sequence: s.sequence });
        continue;
      }

      const { lat, lon } = this.parseWktPoint(s.location);
      const newId = `STOP-${randomUUID().slice(0, 8)}`;
      await stopRepo.save({
        stopId: newId,
        stopName: s.address,
        stopLat: lat,
        stopLon: lon,
        locationType: 0,
        parentStation: null,
        stxStopKind: StopKind.PICKUP,
        stxHazardZone: false,
        stxSchoolId: schoolId,
      } as Stop);
      resolved.push({ stopId: newId, sequence: s.sequence });
    }

    return resolved;
  }

  private async writeStopTimes(
    tx: EntityManager,
    tripId: string,
    startTime: string,
    stops: Array<{ stopId: string; sequence: number }>,
  ): Promise<void> {
    const startSeconds = this.hhmmToSeconds(startTime);
    const rows = stops.map((s, i) => {
      const arrival = startSeconds + i * DEFAULT_INTER_STOP_SECONDS;
      const departure = arrival + DEFAULT_DWELL_SECONDS;
      return {
        tripId,
        stopSequence: s.sequence,
        arrivalTime: this.secondsToHhmmss(arrival),
        departureTime: this.secondsToHhmmss(departure),
        stopId: s.stopId,
        pickupType: 0,
        dropOffType: 0,
        stxDwellSeconds: DEFAULT_DWELL_SECONDS,
      };
    });
    await tx.getRepository(StopTime).save(rows as StopTime[]);
  }

  private parseWktPoint(wkt: string): { lat: number; lon: number } {
    const m = wkt.match(/^POINT\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$/);
    if (!m) {
      throw new BadRequestException(`Invalid WKT POINT: ${wkt}`);
    }
    return { lon: Number(m[1]), lat: Number(m[2]) };
  }

  private hhmmToSeconds(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 3600 + m * 60;
  }

  private secondsToHhmmss(total: number): string {
    const h = Math.floor(total / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((total % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  private async resolveStaIdForSchool(schoolId: string): Promise<string> {
    const row = await this.dataSource
      .getRepository(School)
      .createQueryBuilder('sch')
      .innerJoin(Board, 'b', 'b.id = sch.board_id')
      .select('b.sta_id', 'staId')
      .where('sch.id = :schoolId', { schoolId })
      .getRawOne<{ staId: string }>();
    if (!row?.staId) {
      throw new NotFoundException(
        `School ${schoolId} not found or has no STA anchor.`,
      );
    }
    return row.staId;
  }
}
