import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { School } from './entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    private readonly dataSource: DataSource,
  ) {}

  private async enrichWithLocation(
    schools: School[],
  ): Promise<(School & { location: { lat: number; lng: number } | null })[]> {
    if (!schools.length) return schools as any;
    const rows: { id: string; lat: string; lng: string }[] =
      await this.dataSource.query(
        `SELECT id,
                ST_Y(location::geometry)::text AS lat,
                ST_X(location::geometry)::text AS lng
         FROM stx_schools
         WHERE location IS NOT NULL`,
      );
    const coords = new Map(
      rows.map((r) => [r.id, { lat: Number(r.lat), lng: Number(r.lng) }]),
    );
    return schools.map((s) => ({ ...s, location: coords.get(s.id) ?? null }));
  }

  async findAll(): Promise<School[]> {
    return this.enrichWithLocation(await this.schoolRepository.find());
  }

  async findByBoard(boardId: string): Promise<School[]> {
    return this.enrichWithLocation(
      await this.schoolRepository.find({ where: { boardId } }),
    );
  }

  async findOne(id: string): Promise<School> {
    const school = await this.schoolRepository.findOne({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    const [enriched] = await this.enrichWithLocation([school]);
    return enriched;
  }

  async create(dto: CreateSchoolDto): Promise<School> {
    const school = this.schoolRepository.create({
      name: dto.name,
      boardId: dto.boardId,
    });
    return this.schoolRepository.save(school);
  }

  async update(id: string, dto: UpdateSchoolDto): Promise<School> {
    const school = await this.findOne(id);
    if (dto.name !== undefined) school.name = dto.name;
    if (dto.boardId !== undefined) school.boardId = dto.boardId;
    return this.schoolRepository.save(school);
  }

  async remove(id: string): Promise<void> {
    const school = await this.findOne(id);
    await this.schoolRepository.remove(school);
  }
}
