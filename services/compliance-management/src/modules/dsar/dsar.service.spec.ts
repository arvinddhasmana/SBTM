import { NotFoundException } from '@nestjs/common';
import { DsarService } from './dsar.service';
import { DataSource } from 'typeorm';
import { DsarRequestDto } from './dto/dsar-request.dto';
import { Logger } from '@nestjs/common';

const SCHOOL_A = '00000000-0000-0000-0000-000000000001';
const SCHOOL_B = '00000000-0000-0000-0000-000000000002';
const STUDENT_ID = '00000000-0000-0000-0000-000000000010';

const mockStudentRow = {
    id: STUDENT_ID,
    grade: '5',
    am_route_id: null,
    pm_route_id: null,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const mockPresenceEvents = [
    { id: 'pe-1', schoolId: SCHOOL_A, eventType: 'BOARD', timestamp: new Date().toISOString() },
];

const mockAuditEntries = [
    { id: 'ae-1', action: 'student.view', resource: 'students', resource_id: STUDENT_ID },
];

describe('DsarService', () => {
    let service: DsarService;
    let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;

    beforeEach(() => {
        dataSource = { query: jest.fn() };
        service = new DsarService(dataSource as unknown as DataSource);
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('fulfil()', () => {
        it('should return aggregated DSAR payload for a valid student', async () => {
            (dataSource.query as jest.Mock)
                .mockResolvedValueOnce([mockStudentRow])    // student rows
                .mockResolvedValueOnce(mockPresenceEvents)  // presence events
                .mockResolvedValueOnce(mockAuditEntries);   // audit entries

            const dto: DsarRequestDto = {
                schoolId: SCHOOL_A,
                studentId: STUDENT_ID,
                requestorName: 'Test Requestor',
            };

            const result = await service.fulfil(dto, SCHOOL_A);

            expect(result.studentId).toBe(STUDENT_ID);
            expect(result.schoolId).toBe(SCHOOL_A);
            expect(result.studentProfile).toEqual(mockStudentRow);
            expect(result.presenceEvents).toHaveLength(1);
            expect(result.auditEntries).toHaveLength(1);
            expect(result.requestorName).toBe('Test Requestor');
            expect(result.requestedAt).toBeDefined();
        });

        it('should throw NotFoundException when student not found in this tenant', async () => {
            (dataSource.query as jest.Mock).mockResolvedValueOnce([]); // empty student result

            const dto: DsarRequestDto = {
                schoolId: SCHOOL_A,
                studentId: STUDENT_ID,
                requestorName: 'Test Requestor',
            };

            await expect(service.fulfil(dto, SCHOOL_A)).rejects.toThrow(NotFoundException);
        });

        it('should enforce tenant isolation — uses authenticatedSchoolId, not dto.schoolId', async () => {
            (dataSource.query as jest.Mock)
                .mockResolvedValueOnce([[mockStudentRow]])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const dto: DsarRequestDto = {
                schoolId: SCHOOL_B, // attacker attempts cross-tenant access
                studentId: STUDENT_ID,
                requestorName: 'Attacker',
            };

            const result = await service.fulfil(dto, SCHOOL_A); // JWT says SCHOOL_A

            // The actual query must be scoped to SCHOOL_A (the JWT school), not SCHOOL_B
            const studentQueryParams = (dataSource.query as jest.Mock).mock.calls[0][1];
            expect(studentQueryParams).toContain(SCHOOL_A);
            expect(studentQueryParams).not.toContain(SCHOOL_B);

            // Returned schoolId must reflect the authoritative tenant
            expect(result.schoolId).toBe(SCHOOL_A);
        });

        it('should query students with school_id = authenticatedSchoolId using parameterized SQL', async () => {
            (dataSource.query as jest.Mock)
                .mockResolvedValueOnce([[mockStudentRow]])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const dto: DsarRequestDto = {
                schoolId: SCHOOL_A,
                studentId: STUDENT_ID,
                requestorName: 'Test Requestor',
            };

            await service.fulfil(dto, SCHOOL_A);

            const [studentSql, studentParams] = (dataSource.query as jest.Mock).mock.calls[0];
            expect(studentSql).toContain('WHERE id = $1 AND school_id = $2');
            expect(studentParams[0]).toBe(STUDENT_ID);
            expect(studentParams[1]).toBe(SCHOOL_A);
        });

        it('should not include student name or guardian details in log calls', async () => {
            (dataSource.query as jest.Mock)
                .mockResolvedValueOnce([[mockStudentRow]])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const logSpy = jest.spyOn(Logger.prototype, 'log');

            const dto: DsarRequestDto = {
                schoolId: SCHOOL_A,
                studentId: STUDENT_ID,
                requestorName: 'Sensitive Name',
            };

            await service.fulfil(dto, SCHOOL_A);

            for (const call of logSpy.mock.calls) {
                const logArg = JSON.stringify(call[0]);
                expect(logArg).not.toContain('Sensitive Name');
            }
        });
    });
});
