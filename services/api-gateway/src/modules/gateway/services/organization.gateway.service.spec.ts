import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationGatewayService } from './organization.gateway.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { School } from '../../auth/entities/school.entity';
import { SchoolBoard } from '../../auth/entities/school-board.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role } from '@sbtm/common';

describe('OrganizationGatewayService', () => {
  let service: OrganizationGatewayService;

  const mockSchoolRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockBoardRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const superAdminCaller = {
    id: 'super-admin-1',
    role: Role.SUPER_ADMIN,
  };

  const ostaAdminCaller = {
    id: 'osta-admin-1',
    role: Role.OSTA_ADMIN,
  };

  const boardAdminCaller = {
    id: 'board-admin-1',
    role: Role.BOARD_ADMIN,
    boardId: 'board-1',
  };

  const schoolAdminCaller = {
    id: 'school-admin-1',
    role: Role.SCHOOL_ADMIN,
    schoolId: 'school-1',
  };

  const schoolAdminNoSchool = {
    id: 'school-admin-2',
    role: Role.SCHOOL_ADMIN,
    schoolId: undefined,
  };

  const boardAdminNoBoard = {
    id: 'board-admin-2',
    role: Role.BOARD_ADMIN,
    boardId: undefined,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationGatewayService,
        {
          provide: getRepositoryToken(School),
          useValue: mockSchoolRepository,
        },
        {
          provide: getRepositoryToken(SchoolBoard),
          useValue: mockBoardRepository,
        },
      ],
    }).compile();

    service = module.get<OrganizationGatewayService>(
      OrganizationGatewayService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------- Board CRUD ----------

  describe('listBoards', () => {
    it('should return all boards with schools relation', async () => {
      const mockBoards = [{ id: 'board-1', name: 'Ottawa Board', schools: [] }];
      mockBoardRepository.find.mockResolvedValue(mockBoards);

      const result = await service.listBoards();

      expect(result).toEqual(mockBoards);
      expect(mockBoardRepository.find).toHaveBeenCalledWith({
        relations: ['schools'],
        order: { name: 'ASC' },
      });
    });
  });

  describe('getBoard', () => {
    it('should return board when found', async () => {
      const board = { id: 'board-1', name: 'Ottawa Board' };
      mockBoardRepository.findOne.mockResolvedValue(board);

      const result = await service.getBoard('board-1', superAdminCaller);

      expect(result).toEqual(board);
    });

    it('should throw NotFoundException when board not found', async () => {
      mockBoardRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getBoard('nonexistent', superAdminCaller),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for BOARD_ADMIN viewing another board', async () => {
      const board = { id: 'board-other', name: 'Other Board' };
      mockBoardRepository.findOne.mockResolvedValue(board);

      await expect(
        service.getBoard('board-other', boardAdminCaller),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createBoard', () => {
    it('should create and save a new board', async () => {
      const board = { id: 'board-new', name: 'New Board' };
      mockBoardRepository.create.mockReturnValue(board);
      mockBoardRepository.save.mockResolvedValue(board);

      const result = await service.createBoard({ name: 'New Board' });

      expect(result).toEqual(board);
      expect(mockBoardRepository.create).toHaveBeenCalledWith({
        name: 'New Board',
      });
    });
  });

  describe('updateBoard', () => {
    it('should update board name', async () => {
      const board = { id: 'board-1', name: 'Old Name' };
      mockBoardRepository.findOne.mockResolvedValue(board);
      mockBoardRepository.save.mockResolvedValue({
        ...board,
        name: 'Updated Name',
      });

      const result = await service.updateBoard('board-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when board not found', async () => {
      mockBoardRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateBoard('nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBoard', () => {
    it('should delete board with no schools', async () => {
      const board = { id: 'board-1', name: 'Board', schools: [] };
      mockBoardRepository.findOne.mockResolvedValue(board);
      mockBoardRepository.remove.mockResolvedValue(board);

      const result = await service.deleteBoard('board-1');

      expect(result).toEqual({ message: 'Board deleted successfully' });
      expect(mockBoardRepository.remove).toHaveBeenCalledWith(board);
    });

    it('should throw NotFoundException when board not found', async () => {
      mockBoardRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteBoard('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when board still has schools', async () => {
      const board = {
        id: 'board-1',
        name: 'Board',
        schools: [{ id: 'school-1' }],
      };
      mockBoardRepository.findOne.mockResolvedValue(board);

      await expect(service.deleteBoard('board-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ---------- School CRUD ----------

  describe('listSchools', () => {
    it('should return all schools for SUPER_ADMIN', async () => {
      const mockSchools = [{ id: 'school-1', name: 'School A' }];
      mockSchoolRepository.find.mockResolvedValue(mockSchools);

      const result = await service.listSchools(superAdminCaller);

      expect(result).toEqual(mockSchools);
      expect(mockSchoolRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { name: 'ASC' },
      });
    });

    it('should filter by boardId for SUPER_ADMIN when provided', async () => {
      mockSchoolRepository.find.mockResolvedValue([]);

      await service.listSchools(superAdminCaller, 'board-1');

      expect(mockSchoolRepository.find).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        order: { name: 'ASC' },
      });
    });

    it('should return only own school for SCHOOL_ADMIN', async () => {
      mockSchoolRepository.find.mockResolvedValue([]);

      await service.listSchools(schoolAdminCaller);

      expect(mockSchoolRepository.find).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        order: { name: 'ASC' },
      });
    });

    it('should throw ForbiddenException for SCHOOL_ADMIN without schoolId', async () => {
      await expect(service.listSchools(schoolAdminNoSchool)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return board-scoped schools for BOARD_ADMIN', async () => {
      mockSchoolRepository.find.mockResolvedValue([]);

      await service.listSchools(boardAdminCaller);

      expect(mockSchoolRepository.find).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        order: { name: 'ASC' },
      });
    });

    it('should throw ForbiddenException for BOARD_ADMIN without boardId', async () => {
      await expect(service.listSchools(boardAdminNoBoard)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSchool', () => {
    it('should return school for authorized caller', async () => {
      const school = { id: 'school-1', name: 'School A', boardId: 'board-1' };
      mockSchoolRepository.findOne.mockResolvedValue(school);

      const result = await service.getSchool('school-1', superAdminCaller);

      expect(result).toEqual(school);
    });

    it('should throw NotFoundException when school not found', async () => {
      mockSchoolRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getSchool('nonexistent', superAdminCaller),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for SCHOOL_ADMIN accessing other school', async () => {
      const school = {
        id: 'school-other',
        name: 'Other School',
        boardId: 'board-1',
      };
      mockSchoolRepository.findOne.mockResolvedValue(school);

      await expect(
        service.getSchool('school-other', schoolAdminCaller),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createSchool', () => {
    it('should create school successfully', async () => {
      const school = {
        id: 'school-new',
        name: 'New School',
        boardId: 'board-1',
      };
      mockBoardRepository.findOne.mockResolvedValue({
        id: 'board-1',
        name: 'Board',
      });
      mockSchoolRepository.create.mockReturnValue(school);
      mockSchoolRepository.save.mockResolvedValue(school);

      const result = await service.createSchool(
        { name: 'New School', boardId: 'board-1' },
        ostaAdminCaller,
      );

      expect(result).toEqual(school);
    });

    it('should throw NotFoundException when board does not exist', async () => {
      mockBoardRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createSchool(
          { name: 'School', boardId: 'nonexistent' },
          ostaAdminCaller,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for BOARD_ADMIN creating in another board', async () => {
      await expect(
        service.createSchool(
          { name: 'School', boardId: 'board-other' },
          boardAdminCaller,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deactivateSchool', () => {
    it('should set school status to INACTIVE', async () => {
      const school = {
        id: 'school-1',
        name: 'School A',
        status: 'ACTIVE',
        boardId: 'board-1',
      };
      mockSchoolRepository.findOne.mockResolvedValue(school);
      mockSchoolRepository.save.mockResolvedValue({
        ...school,
        status: 'INACTIVE',
      });

      const result = await service.deactivateSchool(
        'school-1',
        superAdminCaller,
      );

      expect(result.status).toBe('INACTIVE');
    });
  });

  describe('deleteSchool', () => {
    it('should delete school and return success message', async () => {
      const school = {
        id: 'school-1',
        name: 'School A',
        boardId: 'board-1',
      };
      mockSchoolRepository.findOne.mockResolvedValue(school);
      mockSchoolRepository.remove.mockResolvedValue(school);

      const result = await service.deleteSchool('school-1', superAdminCaller);

      expect(result).toEqual({ message: 'School deleted successfully' });
    });

    it('should throw NotFoundException when school not found', async () => {
      mockSchoolRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteSchool('nonexistent', superAdminCaller),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
