import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from './entities/student.entity';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    const student = this.studentRepository.create(createStudentDto);
    return await this.studentRepository.save(student);
  }

  async findAll(query: { school_id?: string; parent_id?: string }): Promise<Student[]> {
    const qb = this.studentRepository
      .createQueryBuilder('student')
      .where('student.deleted_at IS NULL');

    if (query.school_id) {
      qb.andWhere('student.school_id = :school_id', { school_id: query.school_id });
    }

    if (query.parent_id) {
      // v2: resolve student IDs via stx_guardians → stx_student_guardians join table
      const links = await this.studentRepository.manager.query<Array<{ student_id: string }>>(
        `SELECT sg.student_id
                 FROM stx_student_guardians sg
                 JOIN stx_guardians g ON g.id = sg.guardian_id
                 WHERE g.user_id = $1 AND g.deleted_at IS NULL`,
        [query.parent_id],
      );
      if (!links.length) return [];
      qb.andWhere('student.id IN (:...ids)', {
        ids: links.map((r) => r.student_id),
      });
    }

    return await qb.getMany();
  }

  async findOne(id: string): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id, deletedAt: null as any },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }
    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto): Promise<Student> {
    const student = await this.findOne(id);
    Object.assign(student, updateStudentDto);
    return await this.studentRepository.save(student);
  }

  async remove(id: string): Promise<void> {
    const student = await this.findOne(id);
    await this.studentRepository.softRemove(student);
  }
}
