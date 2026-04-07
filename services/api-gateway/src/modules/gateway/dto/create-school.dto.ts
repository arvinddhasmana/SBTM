import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  name: string;

  @IsUUID()
  boardId: string;
}

export class UpdateSchoolDto {
  @IsOptional()
  @IsString()
  name?: string;
}
