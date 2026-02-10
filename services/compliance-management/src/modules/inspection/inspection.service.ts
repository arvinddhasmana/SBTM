import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleInspection, InspectionType } from './entities/vehicle-inspection.entity';

@Injectable()
export class InspectionService {
    constructor(
        @InjectRepository(VehicleInspection)
        private inspectionRepository: Repository<VehicleInspection>,
    ) { }

    async create(createDto: any): Promise<VehicleInspection> {
        const inspection = this.inspectionRepository.create(createDto);
        return this.inspectionRepository.save(inspection) as unknown as Promise<VehicleInspection>;
    }

    async findAll(schoolId: string): Promise<VehicleInspection[]> {
        return this.inspectionRepository.find({
            where: { school_id: schoolId },
            order: { createdAt: 'DESC' },
        });
    }

    async findByVehicle(vehicleId: string): Promise<VehicleInspection[]> {
        return this.inspectionRepository.find({
            where: { vehicle_id: vehicleId },
            order: { createdAt: 'DESC' },
        });
    }

    async getLatestForVehicle(vehicleId: string): Promise<VehicleInspection> {
        return this.inspectionRepository.findOne({
            where: { vehicle_id: vehicleId, type: InspectionType.PRE_TRIP },
            order: { createdAt: 'DESC' },
        });
    }
}
