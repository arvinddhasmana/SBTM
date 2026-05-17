import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
export class CreateEscalationConfigDto {
  @IsString()
  configName: string;

  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  tier: string;

  @IsNumber()
  @Min(30000)
  @Max(600000)
  @IsOptional()
  confirmationTimeoutMs?: number;

  @IsNumber()
  @Min(60000)
  @Max(1800000)
  @IsOptional()
  boardEscalationMs?: number;

  @IsNumber()
  @Min(300000)
  @Max(3600000)
  @IsOptional()
  staEscalationMs?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateEscalationConfigDto {
  @IsNumber()
  @Min(30000)
  @Max(600000)
  @IsOptional()
  confirmationTimeoutMs?: number;

  @IsNumber()
  @Min(60000)
  @Max(1800000)
  @IsOptional()
  boardEscalationMs?: number;

  @IsNumber()
  @Min(300000)
  @Max(3600000)
  @IsOptional()
  staEscalationMs?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
