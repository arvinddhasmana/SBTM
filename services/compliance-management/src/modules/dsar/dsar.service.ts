import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DsarRequestDto } from './dto/dsar-request.dto';

export interface DsarResponse {
    studentId: string;
    schoolId: string;
    requestedAt: string;
    requestorName: string;
    studentProfile: Record<string, unknown> | null;
    presenceEvents: unknown[];
    auditEntries: unknown[];
}

/**
 * DsarService fulfils Data Subject Access Requests (DSARs) under PIPEDA.
 *
 * It aggregates personal data held about a student across:
 *   - Student profile (student-management schema)
 *   - Presence events (student-presence schema)
 *   - Audit log entries referencing the student
 *
 * All queries are school_id-scoped to enforce tenant isolation.
 * PII fields are included in the response payload only — they are NOT logged.
 */
@Injectable()
export class DsarService {
    private readonly logger = new Logger(DsarService.name);

    constructor(private readonly dataSource: DataSource) {}

    async fulfil(dto: DsarRequestDto, authenticatedSchoolId: string): Promise<DsarResponse> {
        // Authoritative tenant context comes from the JWT, not the request body.
        const schoolId = authenticatedSchoolId;

        this.logger.log({
            level: 'info',
            service: 'compliance-management',
            action: 'dsar.initiated',
            studentId: dto.studentId,
            tenantId: schoolId,
        });

        const [studentRows] = await Promise.all([
            this.dataSource.query(
                `SELECT id, grade, am_route_id, pm_route_id, status, "createdAt", "updatedAt"
                 FROM students
                 WHERE id = $1 AND school_id = $2`,
                [dto.studentId, schoolId],
            ),
        ]);

        if (!studentRows || studentRows.length === 0) {
            throw new NotFoundException('Student not found in this tenant');
        }

        const presenceEvents = await this.dataSource.query(
            `SELECT id, "schoolId", "vehicleId", "routeId", "eventType", timestamp, source, "createdAt"
             FROM presence_event
             WHERE "studentId" = $1 AND "schoolId" = $2
             ORDER BY timestamp DESC
             LIMIT 500`,
            [dto.studentId, schoolId],
        );

        const auditEntries = await this.dataSource.query(
            `SELECT id, action, resource, resource_id, ip_address, "createdAt"
             FROM audit_logs
             WHERE resource_id = $1 AND school_id = $2
             ORDER BY "createdAt" DESC
             LIMIT 200`,
            [dto.studentId, schoolId],
        );

        this.logger.log({
            level: 'info',
            service: 'compliance-management',
            action: 'dsar.fulfilled',
            studentId: dto.studentId,
            tenantId: schoolId,
            presenceEventCount: presenceEvents.length,
            auditEntryCount: auditEntries.length,
        });

        return {
            studentId: dto.studentId,
            schoolId,
            requestedAt: new Date().toISOString(),
            requestorName: dto.requestorName,
            studentProfile: studentRows[0] ?? null,
            presenceEvents,
            auditEntries,
        };
    }
}
