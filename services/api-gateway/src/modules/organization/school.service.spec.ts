import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchoolService } from './school.service';
import { School } from './entities/school.entity';

describe('SchoolService (v2)', () => {
  let service: SchoolService;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolService,
        { provide: getRepositoryToken(School), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SchoolService>(SchoolService);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns every school the caller can see', async () => {
      mockRepo.find.mockResolvedValue([
        { id: 's-1', boardId: 'b-1' },
        { id: 's-2', boardId: 'b-2' },
      ]);
      const result = await service.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith();
      expect(result).toHaveLength(2);
    });
  });

  describe('findByBoard', () => {
    it('returns only schools for the given boardId (board-tenant isolation)', async () => {
      mockRepo.find.mockResolvedValue([{ id: 's-1', boardId: 'b-1' }]);
      const result = await service.findByBoard('b-1');
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { boardId: 'b-1' } });
      expect(result[0].boardId).toBe('b-1');
    });
  });

  describe('findOne', () => {
    it('returns the school when found', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 's-1', boardId: 'b-1' });
      const result = await service.findOne('s-1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 's-1' } });
      expect(result.id).toBe('s-1');
    });

    it('throws NotFoundException when missing', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates and returns a new school with boardId', async () => {
      const created = { id: 's-1', name: 'Test School', boardId: 'b-1' };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create({
        name: 'Test School',
        boardId: 'b-1',
      });
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'Test School',
        boardId: 'b-1',
      });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('updates an existing school', async () => {
      const existing = { id: 's-1', name: 'Old Name', boardId: 'b-1' };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockImplementation(async (s) => s);

      const result = await service.update('s-1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
      expect(result.boardId).toBe('b-1');
    });

    it('throws NotFoundException when school does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('ghost', { name: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes an existing school', async () => {
      const existing = { id: 's-2', name: 'To Remove', boardId: 'b-1' };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove('s-2')).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(existing);
    });

    it('throws NotFoundException when school does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
