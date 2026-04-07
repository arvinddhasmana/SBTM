import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../../auth/entities/school.entity';
import { SchoolBoard } from '../../auth/entities/school-board.entity';
import { CreateSchoolDto, UpdateSchoolDto } from '../dto/create-school.dto';
import { CreateBoardDto, UpdateBoardDto } from '../dto/create-board.dto';
import { Role } from '@sbtm/common';

export interface CallerContext {
  id: string;
  role: Role;
  schoolId?: string;
  boardId?: string;
}

@Injectable()
export class OrganizationGatewayService {
  private readonly logger = new Logger(OrganizationGatewayService.name);

  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(SchoolBoard)
    private readonly boardRepository: Repository<SchoolBoard>,
  ) {}

  // ---------- Board CRUD ----------

  async listBoards(): Promise<SchoolBoard[]> {
    return this.boardRepository.find({ order: { name: 'ASC' } });
  }

  async getBoard(id: string, caller: CallerContext): Promise<SchoolBoard> {
    const board = await this.boardRepository.findOne({ where: { id } });
    if (!board) throw new NotFoundException('Board not found');

    if (caller.role === Role.BOARD_ADMIN && caller.boardId !== id) {
      throw new ForbiddenException('You can only view your own board');
    }

    return board;
  }

  async createBoard(dto: CreateBoardDto): Promise<SchoolBoard> {
    const board = this.boardRepository.create({ name: dto.name });
    const saved = await this.boardRepository.save(board);

    this.logger.log('Board created', {
      boardId: saved.id,
      action: 'board.created',
    });

    return saved;
  }

  async updateBoard(id: string, dto: UpdateBoardDto): Promise<SchoolBoard> {
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

  // ---------- School CRUD ----------

  async listSchools(
    caller: CallerContext,
    boardId?: string,
  ): Promise<School[]> {
    if (caller.role === Role.SCHOOL_ADMIN) {
      if (!caller.schoolId) {
        throw new ForbiddenException('User is not associated with a school');
      }
      return this.schoolRepository.find({
        where: { id: caller.schoolId },
        order: { name: 'ASC' },
      });
    }

    if (caller.role === Role.BOARD_ADMIN) {
      if (!caller.boardId) {
        throw new ForbiddenException('User is not associated with a board');
      }
      return this.schoolRepository.find({
        where: { boardId: caller.boardId },
        order: { name: 'ASC' },
      });
    }

    // OSTA_ADMIN / SUPER_ADMIN: return all, optionally filtered by boardId
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
    // BOARD_ADMIN can only create schools within their own board
    if (caller.role === Role.BOARD_ADMIN) {
      if (dto.boardId !== caller.boardId) {
        throw new ForbiddenException(
          'You can only create schools within your own board',
        );
      }
    }

    // Verify board exists
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

  async deactivateSchool(id: string, caller: CallerContext): Promise<School> {
    const school = await this.schoolRepository.findOne({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    this.assertSchoolScope(school, caller);

    school.status = 'INACTIVE';
    const saved = await this.schoolRepository.save(school);

    this.logger.log('School deactivated', {
      schoolId: saved.id,
      action: 'school.deactivated',
    });

    return saved;
  }

  // ---------- private helpers ----------

  private assertSchoolScope(school: School, caller: CallerContext): void {
    if (
      caller.role === Role.SUPER_ADMIN ||
      caller.role === Role.OSTA_ADMIN ||
      caller.role === Role.ADMIN
    ) {
      return;
    }

    if (caller.role === Role.SCHOOL_ADMIN) {
      if (school.id !== caller.schoolId) {
        throw new ForbiddenException('You can only manage your own school');
      }
    }

    if (caller.role === Role.BOARD_ADMIN) {
      if (school.boardId !== caller.boardId) {
        throw new ForbiddenException(
          'You can only manage schools within your board',
        );
      }
    }
  }
}
