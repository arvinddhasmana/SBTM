import { IsString, IsOptional } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  name: string;
}

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  name?: string;
}
