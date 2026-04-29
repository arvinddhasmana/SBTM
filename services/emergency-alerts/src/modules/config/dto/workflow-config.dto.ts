import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkflowConfigDto {
  @ApiProperty({ example: 'CONFIRM', enum: ['CONFIRM', 'FALSE_ALARM', 'REQUEST_INFO', 'RESOLVE', 'STATUS_UPDATE'] })
  @IsEnum(['CONFIRM', 'FALSE_ALARM', 'REQUEST_INFO', 'RESOLVE', 'STATUS_UPDATE'])
  actionName: string;

  @ApiProperty({ example: 'TIER_1', enum: ['TIER_1', 'TIER_2', 'TIER_3'] })
  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  allowedForTier: string;

  @ApiProperty({ example: 'PENDING_CONFIRMATION', enum: ['PENDING_CONFIRMATION', 'CONFIRMED', 'AUTO_ESCALATED', 'ACTIVE', 'RESOLVED', 'FALSE_ALARM'] })
  @IsEnum(['PENDING_CONFIRMATION', 'CONFIRMED', 'AUTO_ESCALATED', 'ACTIVE', 'RESOLVED', 'FALSE_ALARM'])
  allowedForStatus: string;

  @ApiProperty({ example: 'SCHOOL_ADMIN', enum: ['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN', 'DRIVER', 'SYSTEM'] })
  @IsEnum(['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN', 'DRIVER', 'SYSTEM'])
  requiredRole: string;

  @ApiProperty({ example: false, description: 'Whether notes are required for this action' })
  @IsBoolean()
  requiresNotes: boolean;

  @ApiProperty({ example: 'CONFIRMED', required: false, description: 'Status transition after action' })
  @IsString()
  @IsOptional()
  statusTransition?: string;
}

export class UpdateWorkflowConfigDto {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  requiresNotes?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  statusTransition?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
