import {
  IsString,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsUUID()
  staId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  shortCode: string;

  @IsOptional()
  @IsString()
  region?: string;
}
