import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { StudentStatus } from '../entities/student.entity';

export class CreateStudentDto {
  @IsUUID()
  school_id: string;

  @IsString()
  @IsOptional()
  grade?: string;

  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;
}

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  grade?: string;

  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;
}
