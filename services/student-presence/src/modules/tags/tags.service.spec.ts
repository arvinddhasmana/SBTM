
import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StudentTag } from './entities/student-tag.entity';
import { ConflictException } from '@nestjs/common';

describe('TagsService', () => {
    let service: TagsService;

    const mockRepository = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation((tag) => Promise.resolve({ id: 'uuid', ...tag })),
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockResolvedValue([]),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TagsService,
                {
                    provide: getRepositoryToken(StudentTag),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<TagsService>(TagsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create a tag successfully', async () => {
        const dto = {
            schoolId: 'school-001',
            studentId: 'stud-123',
            tagId: 'ble-xyz-789',
            tagType: 'SMARTTAG' as any,
        };

        const result = await service.create(dto);
        expect(result).toBeDefined();
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate tag', async () => {
        mockRepository.findOne.mockResolvedValueOnce({ id: 'existing', tagId: 'ble-xyz-789' });

        const dto = {
            schoolId: 'school-001',
            studentId: 'stud-123',
            tagId: 'ble-xyz-789',
            tagType: 'SMARTTAG' as any,
        };

        await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should find tag by tagId', async () => {
        const mockTag = { id: 'uuid', tagId: 'ble-xyz-789', studentId: 'stud-123' };
        mockRepository.findOne.mockResolvedValueOnce(mockTag);

        const result = await service.findByTagId('ble-xyz-789');
        expect(result).toEqual(mockTag);
    });
});
