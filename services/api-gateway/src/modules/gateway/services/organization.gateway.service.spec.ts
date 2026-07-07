import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Role } from '@sbtm/common';
import {
  OrganizationGatewayService,
  CallerContext,
} from './organization.gateway.service';
import { Board } from '../../organization/entities/board.entity';
import { School } from '../../organization/entities/school.entity';

interface Mocks {
  boardFind: jest.Mock;
  boardFindOne: jest.Mock;
  boardCreate: jest.Mock;
  boardSave: jest.Mock;
  boardSoftRemove: jest.Mock;
  schoolFind: jest.Mock;
  schoolFindOne: jest.Mock;
  schoolCreate: jest.Mock;
  schoolSave: jest.Mock;
  schoolSoftRemove: jest.Mock;
  schoolCount: jest.Mock;
}

function makeService(): { svc: OrganizationGatewayService } & Mocks {
  const mocks: Mocks = {
    boardFind: jest.fn(),
    boardFindOne: jest.fn(),
    boardCreate: jest.fn(),
    boardSave: jest.fn(),
    boardSoftRemove: jest.fn(),
    schoolFind: jest.fn(),
    schoolFindOne: jest.fn(),
    schoolCreate: jest.fn(),
    schoolSave: jest.fn(),
    schoolSoftRemove: jest.fn(),
    schoolCount: jest.fn(),
  };
  const boardRepo = {
    find: mocks.boardFind,
    findOne: mocks.boardFindOne,
    create: mocks.boardCreate,
    save: mocks.boardSave,
    softRemove: mocks.boardSoftRemove,
  } as unknown as Repository<Board>;
  const schoolRepo = {
    find: mocks.schoolFind,
    findOne: mocks.schoolFindOne,
    create: mocks.schoolCreate,
    save: mocks.schoolSave,
    softRemove: mocks.schoolSoftRemove,
    count: mocks.schoolCount,
  } as unknown as Repository<School>;
  return {
    svc: new OrganizationGatewayService(schoolRepo, boardRepo, {
      query: jest.fn().mockResolvedValue([]),
    } as any),
    ...mocks,
  };
}

const superCaller: CallerContext = {
  id: 'u',
  role: Role.SUPER_ADMIN,
  anchorKind: 'super',
  anchorId: null,
};

const staCaller: CallerContext = {
  id: 'u',
  role: Role.STA_ADMIN,
  anchorKind: 'sta',
  anchorId: 'sta-osta',
};

const boardCaller = (anchorId: string): CallerContext => ({
  id: 'u',
  role: Role.BOARD_ADMIN,
  anchorKind: 'board',
  anchorId,
});

const schoolCaller = (anchorId: string): CallerContext => ({
  id: 'u',
  role: Role.SCHOOL_ADMIN,
  anchorKind: 'school',
  anchorId,
});

describe('OrganizationGatewayService.listBoards (v2 STA scoping)', () => {
  it('SUPER_ADMIN sees every board', async () => {
    const { svc, boardFind } = makeService();
    boardFind.mockResolvedValue([{ id: 'b-1' }, { id: 'b-2' }]);
    const out = await svc.listBoards(superCaller);
    expect(boardFind).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    expect(out).toHaveLength(2);
  });

  it('STA_ADMIN is scoped to their STA', async () => {
    const { svc, boardFind } = makeService();
    boardFind.mockResolvedValue([{ id: 'b-1' }]);
    await svc.listBoards(staCaller);
    expect(boardFind).toHaveBeenCalledWith({
      where: { staId: 'sta-osta' },
      order: { name: 'ASC' },
    });
  });

  it('STA_ADMIN without sta anchor is forbidden', async () => {
    const { svc } = makeService();
    await expect(
      svc.listBoards({ ...staCaller, anchorKind: 'school', anchorId: 'sch-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('BOARD_ADMIN sees only their own board', async () => {
    const { svc, boardFind } = makeService();
    boardFind.mockResolvedValue([{ id: 'b-1' }]);
    await svc.listBoards(boardCaller('b-1'));
    expect(boardFind).toHaveBeenCalledWith({
      where: { id: 'b-1' },
      order: { name: 'ASC' },
    });
  });

  it('SCHOOL_ADMIN cannot list boards', async () => {
    const { svc } = makeService();
    await expect(svc.listBoards(schoolCaller('sch-1'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('OrganizationGatewayService.getBoard', () => {
  it('returns board for SUPER_ADMIN', async () => {
    const { svc, boardFindOne } = makeService();
    boardFindOne.mockResolvedValue({ id: 'b-1' });
    const out = await svc.getBoard('b-1', superCaller);
    expect(out.id).toBe('b-1');
  });

  it('throws NotFoundException when board missing', async () => {
    const { svc, boardFindOne } = makeService();
    boardFindOne.mockResolvedValue(null);
    await expect(svc.getBoard('ghost', superCaller)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('forbids BOARD_ADMIN from reading a different board', async () => {
    const { svc, boardFindOne } = makeService();
    boardFindOne.mockResolvedValue({ id: 'b-1' });
    await expect(
      svc.getBoard('b-1', boardCaller('b-other')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows BOARD_ADMIN to read their own board', async () => {
    const { svc, boardFindOne } = makeService();
    boardFindOne.mockResolvedValue({ id: 'b-1' });
    const out = await svc.getBoard('b-1', boardCaller('b-1'));
    expect(out.id).toBe('b-1');
  });
});

describe('OrganizationGatewayService.createBoard', () => {
  it('persists name, staId, shortCode, region from DTO', async () => {
    const { svc, boardCreate, boardSave } = makeService();
    const saved = {
      id: 'b-1',
      name: 'X',
      staId: 'sta-osta',
      shortCode: 'X',
      region: 'East',
    };
    boardCreate.mockReturnValue(saved);
    boardSave.mockResolvedValue(saved);
    const out = await svc.createBoard({
      name: 'X',
      staId: 'sta-osta',
      shortCode: 'X',
      region: 'East',
    });
    expect(boardCreate).toHaveBeenCalledWith({
      name: 'X',
      staId: 'sta-osta',
      shortCode: 'X',
      region: 'East',
    });
    expect(out).toEqual(saved);
  });

  it('coerces omitted region to null', async () => {
    const { svc, boardCreate, boardSave } = makeService();
    boardCreate.mockImplementation((x) => x);
    boardSave.mockImplementation(async (x) => ({ id: 'b-2', ...x }));
    await svc.createBoard({ name: 'NR', staId: 'sta-osta', shortCode: 'NR' });
    expect(boardCreate).toHaveBeenCalledWith({
      name: 'NR',
      staId: 'sta-osta',
      shortCode: 'NR',
      region: null,
    });
  });
});

describe('OrganizationGatewayService.updateBoard', () => {
  it('updates the name field', async () => {
    const { svc, boardFindOne, boardSave } = makeService();
    boardFindOne.mockResolvedValue({ id: 'b-1', name: 'Old' });
    boardSave.mockImplementation(async (b) => b);
    const out = await svc.updateBoard('b-1', { name: 'New' });
    expect(out.name).toBe('New');
  });

  it('throws NotFoundException when board missing', async () => {
    const { svc, boardFindOne } = makeService();
    boardFindOne.mockResolvedValue(null);
    await expect(
      svc.updateBoard('ghost', { name: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('OrganizationGatewayService.deleteBoard', () => {
  it('soft-removes a board with no schools', async () => {
    const { svc, boardFindOne, schoolCount, boardSoftRemove } = makeService();
    const board = { id: 'b-1' };
    boardFindOne.mockResolvedValue(board);
    schoolCount.mockResolvedValue(0);
    const out = await svc.deleteBoard('b-1');
    expect(boardSoftRemove).toHaveBeenCalledWith(board);
    expect(out.message).toMatch(/deleted/i);
  });

  it('throws ForbiddenException when board still has schools', async () => {
    const { svc, boardFindOne, schoolCount } = makeService();
    boardFindOne.mockResolvedValue({ id: 'b-1' });
    schoolCount.mockResolvedValue(2);
    await expect(svc.deleteBoard('b-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when board missing', async () => {
    const { svc, boardFindOne } = makeService();
    boardFindOne.mockResolvedValue(null);
    await expect(svc.deleteBoard('ghost')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('OrganizationGatewayService.listSchools (v2 anchor scoping)', () => {
  it('SCHOOL_ADMIN only sees their own school', async () => {
    const { svc, schoolFind } = makeService();
    schoolFind.mockResolvedValue([{ id: 'sch-1' }]);
    await svc.listSchools(schoolCaller('sch-1'));
    expect(schoolFind).toHaveBeenCalledWith({
      where: { id: 'sch-1' },
      order: { name: 'ASC' },
    });
  });

  it('BOARD_ADMIN sees schools in their board', async () => {
    const { svc, schoolFind } = makeService();
    schoolFind.mockResolvedValue([{ id: 'sch-1', boardId: 'b-1' }]);
    await svc.listSchools(boardCaller('b-1'));
    expect(schoolFind).toHaveBeenCalledWith({
      where: { boardId: 'b-1' },
      order: { name: 'ASC' },
    });
  });

  it('SUPER_ADMIN unfiltered returns all schools', async () => {
    const { svc, schoolFind } = makeService();
    schoolFind.mockResolvedValue([{ id: 'sch-1' }, { id: 'sch-2' }]);
    await svc.listSchools(superCaller);
    expect(schoolFind).toHaveBeenCalledWith({
      where: {},
      order: { name: 'ASC' },
    });
  });

  it('SUPER_ADMIN with boardId filter scopes to that board', async () => {
    const { svc, schoolFind } = makeService();
    schoolFind.mockResolvedValue([]);
    await svc.listSchools(superCaller, 'b-1');
    expect(schoolFind).toHaveBeenCalledWith({
      where: { boardId: 'b-1' },
      order: { name: 'ASC' },
    });
  });

  it('SCHOOL_ADMIN without school anchor is forbidden', async () => {
    const { svc } = makeService();
    await expect(
      svc.listSchools({
        ...schoolCaller('sch-1'),
        anchorKind: 'super',
        anchorId: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('OrganizationGatewayService.getSchool', () => {
  it('returns school for SUPER_ADMIN', async () => {
    const { svc, schoolFindOne } = makeService();
    schoolFindOne.mockResolvedValue({ id: 'sch-1', boardId: 'b-1' });
    const out = await svc.getSchool('sch-1', superCaller);
    expect(out.id).toBe('sch-1');
  });

  it('throws NotFoundException when missing', async () => {
    const { svc, schoolFindOne } = makeService();
    schoolFindOne.mockResolvedValue(null);
    await expect(svc.getSchool('ghost', superCaller)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('forbids BOARD_ADMIN from a school in another board', async () => {
    const { svc, schoolFindOne } = makeService();
    schoolFindOne.mockResolvedValue({ id: 'sch-1', boardId: 'b-1' });
    await expect(
      svc.getSchool('sch-1', boardCaller('b-other')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids SCHOOL_ADMIN from a different school', async () => {
    const { svc, schoolFindOne } = makeService();
    schoolFindOne.mockResolvedValue({ id: 'sch-1', boardId: 'b-1' });
    await expect(
      svc.getSchool('sch-1', schoolCaller('sch-other')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('OrganizationGatewayService.createSchool', () => {
  it('forbids BOARD_ADMIN from creating in another board', async () => {
    const { svc } = makeService();
    await expect(
      svc.createSchool({ name: 'X', boardId: 'b-other' }, boardCaller('b-1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when board missing', async () => {
    const { svc, boardFindOne } = makeService();
    boardFindOne.mockResolvedValue(null);
    await expect(
      svc.createSchool({ name: 'X', boardId: 'b-ghost' }, superCaller),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('persists name + boardId from DTO', async () => {
    const { svc, boardFindOne, schoolCreate, schoolSave } = makeService();
    boardFindOne.mockResolvedValue({ id: 'b-1' });
    const created = { id: 'sch-1', name: 'X', boardId: 'b-1' };
    schoolCreate.mockReturnValue(created);
    schoolSave.mockResolvedValue(created);
    const out = await svc.createSchool(
      { name: 'X', boardId: 'b-1' },
      superCaller,
    );
    expect(schoolCreate).toHaveBeenCalledWith({ name: 'X', boardId: 'b-1' });
    expect(out).toEqual(created);
  });
});

describe('OrganizationGatewayService.updateSchool', () => {
  it('updates name when caller in scope', async () => {
    const { svc, schoolFindOne, schoolSave } = makeService();
    schoolFindOne.mockResolvedValue({
      id: 'sch-1',
      name: 'Old',
      boardId: 'b-1',
    });
    schoolSave.mockImplementation(async (s) => s);
    const out = await svc.updateSchool('sch-1', { name: 'New' }, superCaller);
    expect(out.name).toBe('New');
  });

  it('forbids out-of-scope BOARD_ADMIN', async () => {
    const { svc, schoolFindOne } = makeService();
    schoolFindOne.mockResolvedValue({ id: 'sch-1', boardId: 'b-1' });
    await expect(
      svc.updateSchool('sch-1', { name: 'X' }, boardCaller('b-other')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when missing', async () => {
    const { svc, schoolFindOne } = makeService();
    schoolFindOne.mockResolvedValue(null);
    await expect(
      svc.updateSchool('ghost', { name: 'x' }, superCaller),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('OrganizationGatewayService.deactivateSchool', () => {
  it('soft-removes the school when in scope', async () => {
    const { svc, schoolFindOne, schoolSoftRemove } = makeService();
    const school = { id: 'sch-1', boardId: 'b-1' };
    schoolFindOne.mockResolvedValue(school);
    await svc.deactivateSchool('sch-1', superCaller);
    expect(schoolSoftRemove).toHaveBeenCalledWith(school);
  });

  it('throws NotFoundException when missing', async () => {
    const { svc, schoolFindOne } = makeService();
    schoolFindOne.mockResolvedValue(null);
    await expect(
      svc.deactivateSchool('ghost', superCaller),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('OrganizationGatewayService.deleteSchool', () => {
  it('soft-removes and returns a success message', async () => {
    const { svc, schoolFindOne, schoolSoftRemove } = makeService();
    const school = { id: 'sch-1', boardId: 'b-1' };
    schoolFindOne.mockResolvedValue(school);
    const out = await svc.deleteSchool('sch-1', superCaller);
    expect(schoolSoftRemove).toHaveBeenCalledWith(school);
    expect(out.message).toMatch(/deleted/i);
  });

  it('forbids out-of-scope SCHOOL_ADMIN', async () => {
    const { svc, schoolFindOne } = makeService();
    schoolFindOne.mockResolvedValue({ id: 'sch-1', boardId: 'b-1' });
    await expect(
      svc.deleteSchool('sch-1', schoolCaller('sch-other')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when missing', async () => {
    const { svc, schoolFindOne } = makeService();
    schoolFindOne.mockResolvedValue(null);
    await expect(svc.deleteSchool('ghost', superCaller)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
