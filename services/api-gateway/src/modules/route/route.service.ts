import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Route, RouteDirection } from '../auth/entities/route.entity';
import { RouteStop } from '../auth/entities/route-stop.entity';
import { Vehicle } from '../auth/entities/vehicle.entity';
import { CreateRouteDto, UpdateRouteDto } from './dto/route.dto';
import { RouteChangeNotifierService } from '../gateway/services/route-change-notifier.service';

/**
 * Extract lat/lng from WKT POINT string "POINT(lng lat)"
 */
function parseWktToLatLng(wkt: string): { lat: number; lng: number } | null {
  const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) return null;
  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    private dataSource: DataSource,
    private routeChangeNotifier: RouteChangeNotifierService,
  ) {}

  async create(createRouteDto: CreateRouteDto): Promise<Route> {
    const { schoolId, name, vehicleId, startTime, stops, ...routeFields } =
      createRouteDto;

    // 1. Unique name per school
    const existingName = await this.routeRepository.findOne({
      where: { schoolId, name },
    });
    if (existingName) {
      throw new ConflictException('Route name must be unique within a school');
    }

    // 2. Overlap check if vehicle is assigned
    if (vehicleId) {
      await this.validateVehicleOverlap(
        vehicleId,
        startTime,
        createRouteDto.estimatedDuration || 60,
        null,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create route entity WITHOUT stops to avoid cascade double-insert
      const route = this.routeRepository.create({
        ...routeFields,
        schoolId,
        name,
        vehicleId,
        startTime,
      });
      const savedRoute = await queryRunner.manager.save(route);

      if (stops && stops.length > 0) {
        for (const stop of stops) {
          const coords = parseWktToLatLng(stop.location);
          const lat = coords?.lat ?? null;
          const lng = coords?.lng ?? null;

          if (stop.id) {
            await queryRunner.query(
              `INSERT INTO route_stops (
                              id, "routeId", sequence, address, location, lat, lng
                          ) VALUES ($1, $2, $3, $4, ST_GeomFromText($5, 4326), $6, $7)`,
              [
                stop.id,
                savedRoute.id,
                stop.sequence,
                stop.address,
                stop.location,
                lat,
                lng,
              ],
            );
          } else {
            await queryRunner.query(
              `INSERT INTO route_stops (
                              "routeId", sequence, address, location, lat, lng
                          ) VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6)`,
              [
                savedRoute.id,
                stop.sequence,
                stop.address,
                stop.location,
                lat,
                lng,
              ],
            );
          }
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedRoute.id, schoolId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(schoolId: string): Promise<Route[]> {
    return this.routeRepository.find({
      where: { schoolId },
      relations: ['vehicle', 'stops', 'school'],
    });
  }

  async findOne(id: string, schoolId: string): Promise<Route> {
    const route = await this.routeRepository.findOne({
      where: { id, schoolId },
      relations: ['vehicle', 'stops', 'school'],
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    return route;
  }

  async update(
    id: string,
    schoolId: string,
    updateRouteDto: UpdateRouteDto,
  ): Promise<Route> {
    const route = await this.findOne(id, schoolId);

    if (updateRouteDto.name && updateRouteDto.name !== route.name) {
      const existing = await this.routeRepository.findOne({
        where: { schoolId, name: updateRouteDto.name },
      });
      if (existing) {
        throw new ConflictException(
          'Route name must be unique within a school',
        );
      }
    }

    const newVehicleId = updateRouteDto.vehicleId ?? route.vehicleId;
    const newStartTime = updateRouteDto.startTime ?? route.startTime;
    const newDuration =
      updateRouteDto.estimatedDuration ?? route.estimatedDuration;

    if (newVehicleId) {
      await this.validateVehicleOverlap(
        newVehicleId,
        newStartTime,
        newDuration,
        id,
      );
    }

    const { stops, ...routeFields } = updateRouteDto;
    Object.assign(route, routeFields);

    if (stops !== undefined) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.manager.save(route);

        type StopMeta = {
          id: string;
          address: string;
          sequence: number;
          lat: number | null;
          lng: number | null;
        };

        const oldStops = (await queryRunner.query(
          `SELECT id, address, sequence, lat, lng FROM route_stops WHERE "routeId" = $1`,
          [id],
        )) as StopMeta[];
        const oldStopById = new Map(oldStops.map((s) => [s.id, s]));

        const isValidUuid = (sid: string | undefined): sid is string =>
          !!sid &&
          !sid.startsWith('draft-') &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            sid,
          );

        // Partition incoming stops: those that update an existing row vs. new ones
        const toUpdate = stops.filter(
          (s) => isValidUuid(s.id) && oldStopById.has(s.id!),
        );
        const toInsert = stops.filter(
          (s) => !isValidUuid(s.id) || !oldStopById.has(s.id!),
        );
        const incomingIds = new Set(toUpdate.map((s) => s.id!));
        // Stops in DB but not sent back by the client — admin deliberately removed them
        const removedStopIds = oldStops
          .map((s) => s.id)
          .filter((sid) => !incomingIds.has(sid));

        // UPDATE existing stops in-place — UUID never changes, so student FKs stay valid
        for (const stop of toUpdate) {
          const coords = parseWktToLatLng(stop.location);
          await queryRunner.query(
            `UPDATE route_stops
             SET sequence = $1, address = $2, location = ST_GeomFromText($3, 4326), lat = $4, lng = $5
             WHERE id = $6 AND "routeId" = $7`,
            [
              stop.sequence,
              stop.address,
              stop.location,
              coords?.lat ?? null,
              coords?.lng ?? null,
              stop.id,
              id,
            ],
          );
        }

        // INSERT genuinely new stops (no existing UUID)
        for (const stop of toInsert) {
          const coords = parseWktToLatLng(stop.location);
          await queryRunner.query(
            `INSERT INTO route_stops ("routeId", sequence, address, location, lat, lng)
             VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6)`,
            [
              id,
              stop.sequence,
              stop.address,
              stop.location,
              coords?.lat ?? null,
              coords?.lng ?? null,
            ],
          );
        }

        // DELETE stops the admin removed, then remap affected students to the
        // closest remaining stop (by sequence proximity — most stable signal).
        if (removedStopIds.length > 0) {
          // Remaining stops = updated-in-place + newly inserted (exclude removed ones).
          // We compute this BEFORE deleting so we know which stops to remap toward.
          const remaining = (await queryRunner.query(
            `SELECT id, sequence FROM route_stops
             WHERE "routeId" = $1 AND id != ALL($2::uuid[])
             ORDER BY sequence ASC`,
            [id, removedStopIds],
          )) as Array<{ id: string; sequence: number }>;
          const fallbackStopId = remaining[0]?.id ?? null;

          // Remap students BEFORE deleting — the DB has ON DELETE SET NULL on
          // am_stop_id/pm_stop_id, so deleting first would null the FK and
          // prevent matching on the old UUID.
          for (const removedId of removedStopIds) {
            const old = oldStopById.get(removedId);
            if (!old || !fallbackStopId) continue;

            // Pick the remaining stop whose sequence is closest to the removed one
            const target = remaining.reduce((best, cur) =>
              Math.abs(cur.sequence - old.sequence) <
              Math.abs(best.sequence - old.sequence)
                ? cur
                : best,
            );

            await queryRunner.query(
              `UPDATE students SET am_stop_id = $1 WHERE am_route_id = $2 AND am_stop_id = $3`,
              [target.id, id, removedId],
            );
            await queryRunner.query(
              `UPDATE students SET pm_stop_id = $1 WHERE pm_route_id = $2 AND pm_stop_id = $3`,
              [target.id, id, removedId],
            );
          }

          // Now safe to delete — students already point to new stop IDs
          await queryRunner.query(
            `DELETE FROM route_stops WHERE id = ANY($1::uuid[])`,
            [removedStopIds],
          );
        }

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } else {
      await this.routeRepository.save(route);
    }

    const updated = await this.findOne(id, schoolId);

    void this.routeChangeNotifier.notifyRouteChange(
      id, // Send back original request id
      'Route details updated',
      schoolId,
    );

    return updated;
  }

  private async validateVehicleOverlap(
    vehicleId: string,
    startTime: string,
    duration: number,
    currentRouteId: string | null,
  ) {
    const vehicleRoutes = await this.routeRepository.find({
      where: { vehicleId },
    });

    const newStart = this.timeToMinutes(startTime);
    const newEnd = newStart + duration;

    for (const vRoute of vehicleRoutes) {
      if (vRoute.id === currentRouteId) continue;

      const existingStart = this.timeToMinutes(vRoute.startTime);
      const existingEnd = existingStart + vRoute.estimatedDuration;

      // Overlap condition: (StartA < EndB) and (EndA > StartB)
      if (newStart < existingEnd && newEnd > existingStart) {
        throw new ConflictException(
          `Vehicle already assigned to route ${vRoute.name} at this time`,
        );
      }
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    const route = await this.findOne(id, schoolId);
    await this.routeRepository.remove(route);
  }
}
