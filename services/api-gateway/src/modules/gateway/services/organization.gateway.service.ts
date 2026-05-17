import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../../organization/entities/school.entity';
import { Board } from '../../organization/entities/board.entity';
import { CreateSchoolDto, UpdateSchoolDto } from '../dto/create-school.dto';
import { CreateBoardDto, UpdateBoardDto } from '../dto/create-board.dto';
import { Role } from '@sbtm/common';
import type { AnchorKind } from '../../auth/entities/user.entity';

/**
 * v2 caller context — anchor-based (anchorKind + anchorId) replaces v1 schoolId/boardId
 * on the JWT user.
 */
export interface CallerContext {
  id: string;
  role: Role;
  anchorKind?: AnchorKind | null;
  anchorId?: string | null;
}

@Injectable()
export class OrganizationGatewayService {
  private readonly logger = new Logger(OrganizationGatewayService.name);

  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
  ) {}

  // ---------- Board CRUD ----------

  async listBoards(): Promise<Board[]> {
    // TODO(phase-B): boards now belong to STAs; consider scoping by caller's STA anchor.
    return this.boardRepository.find({ order: { name: 'ASC' } });
  }

  async getBoard(id: string, caller: CallerContext): Promise<Board> {
    const board = await this.boardRepository.findOne({ where: { id } });
    if (!board) throw new NotFoundException('Board not found');

    if (
      caller.role === Role.BOARD_ADMIN &&
      caller.anchorKind === 'board' &&
      caller.anchorId !== id
    ) {
      throw new ForbiddenException('You can only view your own board');
    }

    return board;
  }

  async createBoard(dto: CreateBoardDto): Promise<Board> {
    const board = this.boardRepository.create({
      name: dto.name,
      staId: dto.staId,
      shortCode: dto.shortCode,
      region: dto.region ?? null,
    });
    const saved = await this.boardRepository.save(board);

    this.logger.log('Board created', {
      boardId: saved.id,
      action: 'board.created',
    });

    return saved;
  }

  async updateBoard(id: string, dto: UpdateBoardDto): Promise<Board> {
    const board = await this.boardRepository.findOne({ where: { id } });
    if (!board) throw new NotFoundException('Board not found');

    if (dto.name !== undefined) {
      board.name = dto.name;
    }

    const saved = await this.boardRepository.save(board);

    this.logger.log('Board updated', {
      boardId: saved.id,
      action: 'board.updated',
    });

    return saved;
  }

  async deleteBoard(id: string): Promise<{ message: string }> {
    const board = await this.boardRepository.findOne({ where: { id } });
    if (!board) throw new NotFoundException('Board not found');

    // TODO(phase-B): re-add school-count guard via a JOIN against stx_schools once we
    // re-introduce the inverse relation.
    const schoolCount = await this.schoolRepository.count({
      where: { boardId: id },
    });
    if (schoolCount > 0) {
      throw new ForbiddenException(
        'Cannot delete a board that still has schools. Remove all schools first.',
      );
    }

    await this.boardRepository.softRemove(board);

    this.logger.log('Board deleted', {
      boardId: id,
      action: 'board.deleted',
    });

    return { message: 'Board deleted successfully' };
  }

  // ---------- School CRUD ----------

  async listSchools(
    caller: CallerContext,
    boardId?: string,
  ): Promise<School[]> {
    if (caller.role === Role.SCHOOL_ADMIN) {
      if (caller.anchorKind !== 'school' || !caller.anchorId) {
        throw new ForbiddenException('User is not anchored to a school');
      }
      return this.schoolRepository.find({
        where: { id: caller.anchorId },
        order: { name: 'ASC' },
      });
    }

    if (caller.role === Role.BOARD_ADMIN) {
      if (caller.anchorKind !== 'board' || !caller.anchorId) {
        throw new ForbiddenException('User is not anchored to a board');
      }
      return this.schoolRepository.find({
        where: { boardId: caller.anchorId },
        order: { name: 'ASC' },
      });
    }

    // STA_ADMIN / SUPER_ADMIN: return all, optionally filtered by boardId
    const where = boardId ? { boardId } : {};
    return this.schoolRepository.find({ where, order: { name: 'ASC' } });
  }

  async getSchool(id: string, caller: CallerContext): Promise<School> {
    const school = await this.schoolRepository.findOne({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    this.assertSchoolScope(school, caller);

    return school;
  }

  async createSchool(
    dto: CreateSchoolDto,
    caller: CallerContext,
  ): Promise<School> {
    if (caller.role === Role.BOARD_ADMIN) {
      if (caller.anchorKind !== 'board' || dto.boardId !== caller.anchorId) {
        throw new ForbiddenException(
          'You can only create schools within your own board',
        );
      }
    }

    const board = await this.boardRepository.findOne({
      where: { id: dto.boardId },
    });
    if (!board) throw new NotFoundException('Board not found');

    const school = this.schoolRepository.create({
      name: dto.name,
      boardId: dto.boardId,
    });

    const saved = await this.schoolRepository.save(school);

    this.logger.log('School created', {
      schoolId: saved.id,
      boardId: saved.boardId,
      action: 'school.created',
    });

    return saved;
  }

  async updateSchool(
    id: string,
    dto: UpdateSchoolDto,
    caller: CallerContext,
  ): Promise<School> {
    const school = await this.schoolRepository.findOne({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    this.assertSchoolScope(school, caller);

    if (dto.name !== undefined) {
      school.name = dto.name;
    }

    const saved = await this.schoolRepository.save(school);

    this.logger.log('School updated', {
      schoolId: saved.id,
      action: 'school.updated',
    });

    return saved;
  }

  /**
   * TODO(phase-B): the v2 stx_schools table has no `status` column; soft-delete via
   * deletedAt is the closest equivalent. Kept as a no-op alias until a UI need re-emerges.
   */
  async deactivateSchool(id: string, caller: CallerContext): Promise<School> {
    const school = await this.schoolRepository.findOne({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    this.assertSchoolScope(school, caller);

    await this.schoolRepository.softRemove(school);

    this.logger.log('School deactivated (soft-removed)', {
      schoolId: school.id,
      action: 'school.deactivated',
    });

    return school;
  }

  async deleteSchool(
    id: string,
    caller: CallerContext,
  ): Promise<{ message: string }> {
    const school = await this.schoolRepository.findOne({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    this.assertSchoolScope(school, caller);

    await this.schoolRepository.softRemove(school);

    this.logger.log('School deleted', {
      schoolId: id,
      action: 'school.deleted',
    });

    return { message: 'School deleted successfully' };
  }

  // ---------- private helpers ----------

  private assertSchoolScope(school: School, caller: CallerContext): void {
    if (caller.role === Role.SUPER_ADMIN || caller.role === Role.STA_ADMIN) {
      return;
    }

    if (caller.role === Role.SCHOOL_ADMIN) {
      if (caller.anchorKind !== 'school' || school.id !== caller.anchorId) {
        throw new ForbiddenException('You can only manage your own school');
      }
    }

    if (caller.role === Role.BOARD_ADMIN) {
      if (caller.anchorKind !== 'board' || school.boardId !== caller.anchorId) {
        throw new ForbiddenException(
          'You can only manage schools within your board',
        );
      }
    }
  }
}
