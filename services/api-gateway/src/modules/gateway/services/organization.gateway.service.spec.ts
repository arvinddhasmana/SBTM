import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Role } from '@sbtm/common';
import {
  OrganizationGatewayService,
  CallerContext,
} from './organization.gateway.service';
import { Board } from '../../organization/entities/board.entity';
import { School } from '../../organization/entities/school.entity';

function makeService(): {
  svc: OrganizationGatewayService;
  boardFind: jest.Mock;
} {
  const boardFind = jest.fn();
  const boardRepo = { find: boardFind } as unknown as Repository<Board>;
  const schoolRepo = {} as Repository<School>;
  return {
    svc: new OrganizationGatewayService(schoolRepo, boardRepo),
    boardFind,
  };
}

describe('OrganizationGatewayService.listBoards (v2 STA scoping)', () => {
  it('SUPER_ADMIN sees every board', async () => {
    const { svc, boardFind } = makeService();
    boardFind.mockResolvedValue([{ id: 'b-1' }, { id: 'b-2' }]);
    const caller: CallerContext = {
      id: 'u',
      role: Role.SUPER_ADMIN,
      anchorKind: 'super',
      anchorId: null,
    };
    const out = await svc.listBoards(caller);
    expect(boardFind).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    expect(out).toHaveLength(2);
  });

  it('STA_ADMIN is scoped to their STA', async () => {
    const { svc, boardFind } = makeService();
    boardFind.mockResolvedValue([{ id: 'b-1' }]);
    const caller: CallerContext = {
      id: 'u',
      role: Role.STA_ADMIN,
      anchorKind: 'sta',
      anchorId: 'sta-osta',
    };
    await svc.listBoards(caller);
    expect(boardFind).toHaveBeenCalledWith({
      where: { staId: 'sta-osta' },
      order: { name: 'ASC' },
    });
  });

  it('STA_ADMIN without sta anchor is forbidden', async () => {
    const { svc } = makeService();
    await expect(
      svc.listBoards({
        id: 'u',
        role: Role.STA_ADMIN,
        anchorKind: 'school',
        anchorId: 'sch-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('BOARD_ADMIN sees only their own board', async () => {
    const { svc, boardFind } = makeService();
    boardFind.mockResolvedValue([{ id: 'b-1' }]);
    await svc.listBoards({
      id: 'u',
      role: Role.BOARD_ADMIN,
      anchorKind: 'board',
      anchorId: 'b-1',
    });
    expect(boardFind).toHaveBeenCalledWith({
      where: { id: 'b-1' },
      order: { name: 'ASC' },
    });
  });

  it('SCHOOL_ADMIN cannot list boards', async () => {
    const { svc } = makeService();
    await expect(
      svc.listBoards({
        id: 'u',
        role: Role.SCHOOL_ADMIN,
        anchorKind: 'school',
        anchorId: 'sch-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
