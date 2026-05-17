import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchoolBoardService } from './school-board.service';
import { Board } from './entities/board.entity';

describe('SchoolBoardService (v2 — stx_boards)', () => {
  let service: SchoolBoardService;

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
        SchoolBoardService,
        { provide: getRepositoryToken(Board), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SchoolBoardService>(SchoolBoardService);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns every board', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'b-1' }, { id: 'b-2' }]);
      const out = await service.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith();
      expect(out).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('returns the board when found', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'b-1' });
      const out = await service.findOne('b-1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'b-1' } });
      expect(out.id).toBe('b-1');
    });

    it('throws NotFoundException when missing', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('persists name + staId + shortCode + region from the DTO', async () => {
      const created = {
        id: 'b-1',
        name: 'Test Board',
        staId: 'sta-osta',
        shortCode: 'TB',
        region: 'East',
      };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const out = await service.create({
        name: 'Test Board',
        staId: 'sta-osta',
        shortCode: 'TB',
        region: 'East',
      });

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'Test Board',
        staId: 'sta-osta',
        shortCode: 'TB',
        region: 'East',
      });
      expect(mockRepo.save).toHaveBeenCalledWith(created);
      expect(out).toEqual(created);
    });

    it('coerces an omitted region to null (v2 nullable column)', async () => {
      mockRepo.create.mockImplementation((x) => x);
      mockRepo.save.mockImplementation(async (x) => ({ id: 'b-2', ...x }));

      await service.create({
        name: 'No Region',
        staId: 'sta-osta',
        shortCode: 'NR',
      });

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'No Region',
        staId: 'sta-osta',
        shortCode: 'NR',
        region: null,
      });
    });
  });

  describe('update', () => {
    it('updates an existing board name', async () => {
      const existing = { id: 'b-1', name: 'Old Name', staId: 'sta-osta' };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockImplementation(async (b) => b);

      const out = await service.update('b-1', { name: 'New Name' });
      expect(out.name).toBe('New Name');
      expect(out.staId).toBe('sta-osta');
    });

    it('throws NotFoundException when board id does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('ghost', { name: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes an existing board', async () => {
      const existing = { id: 'b-2', name: 'To Remove' };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove('b-2')).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(existing);
    });

    it('throws NotFoundException when board id does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
