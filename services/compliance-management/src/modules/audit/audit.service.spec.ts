import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

describe('AuditService', () => {
    let service: AuditService;
    let repository: any;

    const mockRepository = {
        create: jest.fn().mockImplementation(dto => dto),
        save: jest.fn().mockImplementation(log => Promise.resolve({ id: 'uuid', ...log })),
        find: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                {
                    provide: getRepositoryToken(AuditLog),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
        repository = module.get(getRepositoryToken(AuditLog));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should log an action', async () => {
        const logDto = { user_id: 'u1', action: 'LOGIN', school_id: 's1' };
        const result = await service.log(logDto);
        expect(result).toEqual(expect.objectContaining(logDto));
        expect(repository.save).toHaveBeenCalled();
    });

    it('should find all logs for a school', async () => {
        const logs = [{ id: '1', school_id: 's1' }];
        repository.find.mockResolvedValue(logs);
        const result = await service.findAll('s1');
        expect(result).toEqual(logs);
        expect(repository.find).toHaveBeenCalled();
    });
});
