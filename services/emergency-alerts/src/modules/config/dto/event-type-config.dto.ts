import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
export class CreateEventTypeConfigDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  eventType: string;

  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  tier: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  requiresConfirmation: boolean;

  @IsBoolean()
  notifyParents: boolean;
}

export class UpdateEventTypeConfigDto {
  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  @IsOptional()
  tier?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  requiresConfirmation?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyParents?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
