import { IsString, IsBoolean, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventTypeConfigDto {
  @ApiProperty({ example: 'CUSTOM_EVENT', description: 'Unique event type identifier' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  eventType: string;

  @ApiProperty({ example: 'TIER_2', enum: ['TIER_1', 'TIER_2', 'TIER_3'] })
  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  tier: string;

  @ApiProperty({ example: 'Custom Event', description: 'Display name for the event' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ required: false, description: 'Detailed description of the event' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: false, description: 'Whether confirmation is required' })
  @IsBoolean()
  requiresConfirmation: boolean;

  @ApiProperty({ example: true, description: 'Whether to notify parents' })
  @IsBoolean()
  notifyParents: boolean;
}

export class UpdateEventTypeConfigDto {
  @ApiProperty({ required: false })
  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  @IsOptional()
  tier?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  requiresConfirmation?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  notifyParents?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
