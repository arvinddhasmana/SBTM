import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private auditRepository: Repository<AuditLog>,
    ) { }

    async log(logDto: any): Promise<AuditLog> {
        const log = this.auditRepository.create(logDto);
        return this.auditRepository.save(log) as unknown as Promise<AuditLog>;
    }

    async findAll(schoolId: string): Promise<AuditLog[]> {
        return this.auditRepository.find({
            where: { school_id: schoolId },
            order: { createdAt: 'DESC' },
        });
    }

    async findByResource(resource: string, resourceId: string): Promise<AuditLog[]> {
        return this.auditRepository.find({
            where: { resource, resource_id: resourceId },
            order: { createdAt: 'DESC' },
        });
    }
}
