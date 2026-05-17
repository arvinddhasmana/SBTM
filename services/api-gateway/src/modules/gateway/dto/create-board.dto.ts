import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  name: string;

  @IsUUID()
  staId: string;

  @IsString()
  shortCode: string;

  @IsOptional()
  @IsString()
  region?: string;
}

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  shortCode?: string;

  @IsOptional()
  @IsString()
  region?: string;
}
