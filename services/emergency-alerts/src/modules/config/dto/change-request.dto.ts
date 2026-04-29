import { IsString, IsUUID, IsObject, IsOptional } from 'class-validator';
export class CreateChangeRequestDto {
  @IsString()
  configType: string;

  @IsString()
  changeDescription: string;

  @IsObject()
  requestedConfig: Record<string, any>;

  @IsString()
  @IsOptional()
  justification?: string;
}

export class ReviewChangeRequestDto {
  @IsString()
  action: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
