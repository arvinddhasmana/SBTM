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
          if (stop.id) {
            await queryRunner.query(
              `INSERT INTO route_stops (
                              id, "routeId", sequence, address, location
                          ) VALUES ($1, $2, $3, $4, ST_GeomFromText($5, 4326))`,
              [
                stop.id,
                savedRoute.id,
                stop.sequence,
                stop.address,
                stop.location,
              ],
            );
          } else {
            await queryRunner.query(
              `INSERT INTO route_stops (
                              "routeId", sequence, address, location
                          ) VALUES ($1, $2, $3, ST_GeomFromText($4, 4326))`,
              [savedRoute.id, stop.sequence, stop.address, stop.location],
            );
          }
        }
      }

      await this.syncRouteToReference(queryRunner, savedRoute.id);

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
    let operationalId = id;
    let originalName: string | null = null;

    if (id.startsWith('ROUTE-')) {
      const refRows = await this.dataSource.query(
        `SELECT name FROM routes_reference WHERE id = $1 AND "schoolId" = $2 LIMIT 1`,
        [id, schoolId],
      );
      if (refRows.length > 0) {
        originalName = refRows[0].name;
        const opRows = await this.routeRepository.findOne({
          where: { name: refRows[0].name, schoolId },
        });
        if (opRows) {
          operationalId = opRows.id;
        }
      }
    } else {
      const opRows = await this.routeRepository.findOne({
        where: { id, schoolId },
      });
      if (opRows) originalName = opRows.name;
    }

    const route = await this.findOne(operationalId, schoolId);

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
        operationalId,
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
        await queryRunner.query(
          `DELETE FROM route_stops WHERE "routeId" = $1`,
          [operationalId],
        );
        for (const stop of stops) {
          if (stop.id && !stop.id.startsWith('draft-')) {
            // Keep the same ID if it is a valid UUID. If it's a legacy STOP-... we can't save it as UUID in operational, but wait
            // Operational route_stops table requires UUID! If stop.id is 'STOP-...', it fails!
            const isValidUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                stop.id,
              );
            if (isValidUuid) {
              await queryRunner.query(
                `INSERT INTO route_stops (id, "routeId", sequence, address, location)
                 VALUES ($1, $2, $3, $4, ST_GeomFromText($5, 4326))`,
                [
                  stop.id,
                  operationalId,
                  stop.sequence,
                  stop.address,
                  stop.location,
                ],
              );
            } else {
              await queryRunner.query(
                `INSERT INTO route_stops ("routeId", sequence, address, location)
                 VALUES ($1, $2, $3, ST_GeomFromText($4, 4326))`,
                [operationalId, stop.sequence, stop.address, stop.location],
              );
            }
          } else {
            await queryRunner.query(
              `INSERT INTO route_stops ("routeId", sequence, address, location)
               VALUES ($1, $2, $3, ST_GeomFromText($4, 4326))`,
              [operationalId, stop.sequence, stop.address, stop.location],
            );
          }
        }
        await this.syncRouteToReference(
          queryRunner,
          operationalId,
          originalName,
        );
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } else {
      await this.routeRepository.save(route);
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      try {
        await this.syncRouteToReference(qr, operationalId, originalName);
      } finally {
        await qr.release();
      }
    }

    const updated = await this.findOne(operationalId, schoolId);

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
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      // Resolve reference id by name+school before deleting operational row
      const refRows = await qr.query(
        `SELECT id FROM routes_reference WHERE name = $1 AND "schoolId" = $2 LIMIT 1`,
        [route.name, route.schoolId],
      );
      const refId: string | undefined = refRows[0]?.id;
      await this.routeRepository.remove(route);
      if (refId) {
        await qr.query(
          `DELETE FROM route_stops_reference WHERE "routeId" = $1`,
          [refId],
        );
        await qr.query(`DELETE FROM routes_reference WHERE id = $1`, [refId]);
      }
    } finally {
      await qr.release();
    }
  }

  /**
   * Mirror operational route + stops into the legacy reference tables
   * (routes_reference, route_stops_reference) used by Driver App and Parent Portal.
   * Match strategy: (schoolId, name) — unique per the routes table constraint.
   * If no reference row exists, one is created using the operational route id.
   */
  private async syncRouteToReference(
    qr: any,
    operationalRouteId: string,
    originalName: string | null = null,
  ): Promise<void> {
    const routeRows = await qr.query(
      `SELECT id, name, "schoolId", direction, "vehicleId", "startTime", polyline
       FROM routes WHERE id = $1`,
      [operationalRouteId],
    );
    const route = routeRows[0];
    if (!route) return;

    // Use originalName to find the record in routes_reference, if name was updated
    const searchName = originalName || route.name;

    const existing = await qr.query(
      `SELECT id FROM routes_reference WHERE name = $1 AND "schoolId" = $2 LIMIT 1`,
      [searchName, route.schoolId],
    );
    const refId: string = existing[0]?.id ?? route.id;
    const schedule = JSON.stringify({
      startTime: (route.startTime || '').slice(0, 5),
    });

    if (existing[0]) {
      await qr.query(
        `UPDATE routes_reference
         SET name = $1, "vehicleId" = $2, schedule = $3::jsonb,
             polyline = $4, direction = $5
         WHERE id = $6`,
        [
          route.name,
          route.vehicleId,
          schedule,
          route.polyline,
          route.direction,
          refId,
        ],
      );
    } else {
      await qr.query(
        `INSERT INTO routes_reference
           (id, name, "vehicleId", schedule, polyline, "schoolId", direction)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
        [
          refId,
          route.name,
          route.vehicleId,
          schedule,
          route.polyline,
          route.schoolId,
          route.direction,
        ],
      );
    }

    const stops = await qr.query(
      `SELECT id, sequence, address,
              ST_Y(location::geometry) AS lat,
              ST_X(location::geometry) AS lng
       FROM route_stops WHERE "routeId" = $1 ORDER BY sequence ASC`,
      [operationalRouteId],
    );

    // To prevent assigned students from disappearing, we preserve the old legacy STOP- UUIDs
    // by matching on sequence order.
    const oldStops = await qr.query(
      `SELECT id, "sequenceOrder" FROM route_stops_reference WHERE "routeId" = $1`,
      [refId],
    );

    await qr.query(`DELETE FROM route_stops_reference WHERE "routeId" = $1`, [
      refId,
    ]);
    for (const s of stops) {
      // Find matching old stop by sequence
      const oldStop = oldStops.find(
        (os: any) => os.sequenceOrder === s.sequence,
      );
      const finalId = oldStop ? oldStop.id : s.id;

      await qr.query(
        `INSERT INTO route_stops_reference
           (id, "routeId", "sequenceOrder", "stopName", lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [finalId, refId, s.sequence, s.address, s.lat, s.lng],
      );
    }
  }
}
