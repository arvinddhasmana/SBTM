import { DataRetentionService } from './data-retention.service';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

describe('DataRetentionService', () => {
    let service: DataRetentionService;
    let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;

    beforeEach(() => {
        dataSource = { query: jest.fn().mockResolvedValue([null, 0]) };
        service = new DataRetentionService(dataSource as unknown as DataSource);
        // Silence logger output in tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('purgeExpiredGpsRecords()', () => {
        it('should delete location_point rows older than 90 days', async () => {
            (dataSource.query as jest.Mock).mockResolvedValue([null, 5]);

            await service.purgeExpiredGpsRecords();

            const [sql, params] = (dataSource.query as jest.Mock).mock.calls[0];
            expect(sql).toContain('DELETE FROM location_point');
            expect(sql).toContain('timestamp < $1');
            const cutoff = params[0] as Date;
            const diffDays = Math.round(
                (Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24),
            );
            expect(diffDays).toBeGreaterThanOrEqual(89);
            expect(diffDays).toBeLessThanOrEqual(91);
        });

        it('should log an error without PII when the query throws', async () => {
            (dataSource.query as jest.Mock).mockRejectedValue(new Error('DB down'));
            const errorSpy = jest.spyOn(Logger.prototype, 'error');

            await service.purgeExpiredGpsRecords();

            expect(errorSpy).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'retention.gps.purge.failed' }),
            );
        });
    });

    describe('purgeExpiredPresenceEvents()', () => {
        it('should delete presence_event rows older than 90 days', async () => {
            await service.purgeExpiredPresenceEvents();

            const [sql] = (dataSource.query as jest.Mock).mock.calls[0];
            expect(sql).toContain('DELETE FROM presence_event');
            expect(sql).toContain('"createdAt" < $1');
        });
    });

    describe('purgeExpiredAlerts()', () => {
        it('should delete emergency_alert rows older than 365 days', async () => {
            await service.purgeExpiredAlerts();

            const [sql, params] = (dataSource.query as jest.Mock).mock.calls[0];
            expect(sql).toContain('DELETE FROM emergency_alert');
            const cutoff = params[0] as Date;
            const diffDays = Math.round(
                (Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24),
            );
            expect(diffDays).toBeGreaterThanOrEqual(364);
            expect(diffDays).toBeLessThanOrEqual(366);
        });
    });

    describe('purgeExpiredAuditLogs()', () => {
        it('should delete audit_logs rows older than 730 days', async () => {
            await service.purgeExpiredAuditLogs();

            const [sql, params] = (dataSource.query as jest.Mock).mock.calls[0];
            expect(sql).toContain('DELETE FROM audit_logs');
            const cutoff = params[0] as Date;
            const diffDays = Math.round(
                (Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24),
            );
            expect(diffDays).toBeGreaterThanOrEqual(729);
            expect(diffDays).toBeLessThanOrEqual(731);
        });
    });

    describe('anonymiseInactiveStudents()', () => {
        it('should anonymise students with withdrawn_at older than 365 days', async () => {
            await service.anonymiseInactiveStudents();

            const [sql] = (dataSource.query as jest.Mock).mock.calls[0];
            expect(sql).toContain('UPDATE students');
            expect(sql).toContain('REDACTED');
        });
    });
});
