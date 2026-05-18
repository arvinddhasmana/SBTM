import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
  ) {}

  async findAll(): Promise<Board[]> {
    return this.boardRepository.find();
  }

  async findOne(id: string): Promise<Board> {
    const board = await this.boardRepository.findOne({
      where: { id },
    });
    if (!board) throw new NotFoundException('Board not found');
    return board;
  }

  async create(dto: CreateBoardDto): Promise<Board> {
    const board = this.boardRepository.create({
      name: dto.name,
      staId: dto.staId,
      shortCode: dto.shortCode,
      region: dto.region ?? null,
    });
    return this.boardRepository.save(board);
  }

  async update(id: string, dto: UpdateBoardDto): Promise<Board> {
    const board = await this.findOne(id);
    if (dto.name !== undefined) {
      board.name = dto.name;
    }
    return this.boardRepository.save(board);
  }

  async remove(id: string): Promise<void> {
    const board = await this.findOne(id);
    await this.boardRepository.remove(board);
  }
}
