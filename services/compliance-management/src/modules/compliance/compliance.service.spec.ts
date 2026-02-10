import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ComplianceService } from './compliance.service';
import { DriverCompliance, ComplianceStatus } from './entities/driver-compliance.entity';
import { NotFoundException } from '@nestjs/common';

describe('ComplianceService', () => {
    let service: ComplianceService;
    let repository: any;

    const mockRepository = {
        findOne: jest.fn(),
        create: jest.fn().mockImplementation(dto => dto),
        save: jest.fn().mockImplementation(compliance => Promise.resolve({ id: 'uuid', ...compliance })),
        find: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ComplianceService,
                {
                    provide: getRepositoryToken(DriverCompliance),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<ComplianceService>(ComplianceService);
        repository = module.get(getRepositoryToken(DriverCompliance));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should find compliance by driver id', async () => {
        const compliance = { id: '1', driver_id: 'd1' };
        repository.findOne.mockResolvedValue(compliance);
        const result = await service.findOneByDriver('d1');
        expect(result).toEqual(compliance);
    });

    it('should throw NotFoundException if compliance not found', async () => {
        repository.findOne.mockResolvedValue(null);
        await expect(service.findOneByDriver('d1')).rejects.toThrow(NotFoundException);
    });

    it('should update or create compliance', async () => {
        repository.findOne.mockResolvedValue(null);
        const updateDto = { status: ComplianceStatus.VALID };
        const result = await service.update('d1', updateDto);
        expect(result).toEqual(expect.objectContaining({ driver_id: 'd1', ...updateDto }));
        expect(repository.save).toHaveBeenCalled();
    });
});
