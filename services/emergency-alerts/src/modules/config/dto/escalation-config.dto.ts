import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEscalationConfigDto {
  @ApiProperty({ example: 'tier1-custom', description: 'Unique configuration name' })
  @IsString()
  configName: string;

  @ApiProperty({ example: 'TIER_1', enum: ['TIER_1', 'TIER_2', 'TIER_3'] })
  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  tier: string;

  @ApiProperty({ example: 120000, description: 'Confirmation timeout in milliseconds', required: false })
  @IsNumber()
  @Min(30000)
  @Max(600000)
  @IsOptional()
  confirmationTimeoutMs?: number;

  @ApiProperty({ example: 300000, description: 'Board escalation time in milliseconds', required: false })
  @IsNumber()
  @Min(60000)
  @Max(1800000)
  @IsOptional()
  boardEscalationMs?: number;

  @ApiProperty({ example: 900000, description: 'OSTA escalation time in milliseconds', required: false })
  @IsNumber()
  @Min(300000)
  @Max(3600000)
  @IsOptional()
  ostaEscalationMs?: number;

  @ApiProperty({ example: false, description: 'Whether this is the default configuration' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateEscalationConfigDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @Min(30000)
  @Max(600000)
  @IsOptional()
  confirmationTimeoutMs?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(60000)
  @Max(1800000)
  @IsOptional()
  boardEscalationMs?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(300000)
  @Max(3600000)
  @IsOptional()
  ostaEscalationMs?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
