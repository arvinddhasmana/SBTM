import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { Run } from './entities/run.entity';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

/**
 * v2 FleetService — vehicles now belong to an Operator (not a School). Scoping switched from
 * schoolId → operatorId; "active route" check is now "vehicle has an upcoming/in-progress Run".
 */
@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Run)
    private runRepository: Repository<Run>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    const existing = await this.vehicleRepository.findOne({
      where: {
        operatorId: createVehicleDto.operatorId,
        licensePlate: createVehicleDto.licensePlate,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Vehicle with this license plate already exists for this operator',
      );
    }

    const vehicle = this.vehicleRepository.create(createVehicleDto);
    return this.vehicleRepository.save(vehicle);
  }

  async findAll(operatorId?: string): Promise<Vehicle[]> {
    return this.vehicleRepository.find(
      operatorId ? { where: { operatorId } } : {},
    );
  }

  async findOne(id: string, operatorId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id, operatorId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async update(
    id: string,
    operatorId: string,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.findOne(id, operatorId);

    if (
      updateVehicleDto.licensePlate &&
      updateVehicleDto.licensePlate !== vehicle.licensePlate
    ) {
      const existing = await this.vehicleRepository.findOne({
        where: {
          operatorId,
          licensePlate: updateVehicleDto.licensePlate,
        },
      });
      if (existing) {
        throw new ConflictException(
          'Vehicle with this license plate already exists for this operator',
        );
      }
    }

    Object.assign(vehicle, updateVehicleDto);
    return this.vehicleRepository.save(vehicle);
  }

  async remove(id: string, operatorId: string): Promise<void> {
    const vehicle = await this.findOne(id, operatorId);

    // Constraint: Cannot delete a Vehicle that is assigned to an in-progress or scheduled Run.
    const activeRuns = await this.runRepository.find({
      where: { vehicleId: id },
    });

    if (activeRuns.length > 0) {
      throw new BadRequestException(
        'Cannot delete vehicle assigned to active runs',
      );
    }

    await this.vehicleRepository.remove(vehicle);
  }
}
