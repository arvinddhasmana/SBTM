import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverCompliance, ComplianceStatus } from './entities/driver-compliance.entity';

@Injectable()
export class ComplianceService {
    constructor(
        @InjectRepository(DriverCompliance)
        private complianceRepository: Repository<DriverCompliance>,
    ) { }

    async findOneByDriver(driverId: string): Promise<DriverCompliance> {
        const compliance = await this.complianceRepository.findOne({
            where: { driver_id: driverId },
        }) as unknown as DriverCompliance;
        if (!compliance) {
            throw new NotFoundException(`Compliance record for driver ${driverId} not found`);
        }
        return compliance;
    }

    async update(driverId: string, updateDto: any): Promise<DriverCompliance> {
        let compliance: DriverCompliance = await this.complianceRepository.findOne({
            where: { driver_id: driverId },
        }) as any;

        if (!compliance) {
            compliance = this.complianceRepository.create({
                driver_id: driverId,
                ...updateDto,
            } as any) as any;
        } else {
            Object.assign(compliance, updateDto);
        }

        return this.complianceRepository.save(compliance) as unknown as Promise<DriverCompliance>;
    }

    async findAll(schoolId: string): Promise<DriverCompliance[]> {
        return this.complianceRepository.find({
            where: { school_id: schoolId },
        }) as unknown as Promise<DriverCompliance[]>;
    }

    async getExpiringSoon(schoolId: string): Promise<DriverCompliance[]> {
        return this.complianceRepository.find({
            where: {
                school_id: schoolId,
                status: ComplianceStatus.EXPIRING_SOON
            },
        }) as unknown as Promise<DriverCompliance[]>;
    }
}
