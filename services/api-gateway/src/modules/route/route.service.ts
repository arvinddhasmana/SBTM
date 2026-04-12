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

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    private dataSource: DataSource,
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
          await queryRunner.query(
            `INSERT INTO route_stops (
                            "routeId", sequence, address, location
                        ) VALUES ($1, $2, $3, ST_GeomFromText($4, 4326))`,
            [savedRoute.id, stop.sequence, stop.address, stop.location],
          );
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

    Object.assign(route, updateRouteDto);
    return this.routeRepository.save(route);
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
