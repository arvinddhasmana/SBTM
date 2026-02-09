import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle, VehicleStatus } from '../auth/entities/vehicle.entity';
import { Route } from '../auth/entities/route.entity';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class FleetService {
    constructor(
        @InjectRepository(Vehicle)
        private vehicleRepository: Repository<Vehicle>,
        @InjectRepository(Route)
        private routeRepository: Repository<Route>,
    ) { }

    async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
        const existing = await this.vehicleRepository.findOne({
            where: {
                schoolId: createVehicleDto.schoolId,
                licensePlate: createVehicleDto.licensePlate,
            },
        });

        if (existing) {
            throw new ConflictException('Vehicle with this license plate already exists in this school');
        }

        const vehicle = this.vehicleRepository.create(createVehicleDto);
        return this.vehicleRepository.save(vehicle);
    }

    async findAll(schoolId: string): Promise<Vehicle[]> {
        return this.vehicleRepository.find({
            where: { schoolId },
            relations: ['routes'],
        });
    }

    async findOne(id: string, schoolId: string): Promise<Vehicle> {
        const vehicle = await this.vehicleRepository.findOne({
            where: { id, schoolId },
            relations: ['routes'],
        });

        if (!vehicle) {
            throw new NotFoundException('Vehicle not found');
        }

        return vehicle;
    }

    async update(id: string, schoolId: string, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle> {
        const vehicle = await this.findOne(id, schoolId);

        if (updateVehicleDto.licensePlate && updateVehicleDto.licensePlate !== vehicle.licensePlate) {
            const existing = await this.vehicleRepository.findOne({
                where: {
                    schoolId,
                    licensePlate: updateVehicleDto.licensePlate,
                },
            });
            if (existing) {
                throw new ConflictException('Vehicle with this license plate already exists in this school');
            }
        }

        Object.assign(vehicle, updateVehicleDto);
        return this.vehicleRepository.save(vehicle);
    }

    async remove(id: string, schoolId: string): Promise<void> {
        const vehicle = await this.findOne(id, schoolId);

        // Constraint: Cannot delete a Vehicle if it is assigned to an active Route
        const activeRoutes = await this.routeRepository.find({
            where: { vehicleId: id },
        });

        if (activeRoutes.length > 0) {
            throw new BadRequestException('Cannot delete vehicle assigned to active routes');
        }

        await this.vehicleRepository.remove(vehicle);
    }
}
