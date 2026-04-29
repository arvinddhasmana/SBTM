import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
export class CreateWorkflowConfigDto {
  @IsEnum([
    'CONFIRM',
    'FALSE_ALARM',
    'REQUEST_INFO',
    'RESOLVE',
    'STATUS_UPDATE',
  ])
  actionName: string;

  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  allowedForTier: string;

  @IsEnum([
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'AUTO_ESCALATED',
    'ACTIVE',
    'RESOLVED',
    'FALSE_ALARM',
  ])
  allowedForStatus: string;

  @IsEnum([
    'SUPER_ADMIN',
    'OSTA_ADMIN',
    'BOARD_ADMIN',
    'SCHOOL_ADMIN',
    'DRIVER',
    'SYSTEM',
  ])
  requiredRole: string;

  @IsBoolean()
  requiresNotes: boolean;

  @IsString()
  @IsOptional()
  statusTransition?: string;
}

export class UpdateWorkflowConfigDto {
  @IsBoolean()
  @IsOptional()
  requiresNotes?: boolean;

  @IsString()
  @IsOptional()
  statusTransition?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
