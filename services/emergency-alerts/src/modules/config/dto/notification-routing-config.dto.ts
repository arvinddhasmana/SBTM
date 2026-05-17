import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsEnum,
  ArrayNotEmpty,
} from 'class-validator';
export class CreateNotificationRoutingConfigDto {
  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  tier: string;

  @IsString()
  @IsOptional()
  eventType?: string;

  @IsEnum([
    'SUPER_ADMIN',
    'STA_ADMIN',
    'BOARD_ADMIN',
    'SCHOOL_ADMIN',
    'DRIVER',
    'PARENT',
    'SYSTEM',
  ])
  recipientRole: string;

  @IsEnum(['IMMEDIATE', 'AFTER_CONFIRMATION', 'ON_TIMEOUT', 'ON_ESCALATION'])
  notificationTiming: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  channels: string[];

  @IsBoolean()
  isMandatory: boolean;
}

export class UpdateNotificationRoutingConfigDto {
  @IsEnum(['IMMEDIATE', 'AFTER_CONFIRMATION', 'ON_TIMEOUT', 'ON_ESCALATION'])
  @IsOptional()
  notificationTiming?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  channels?: string[];

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
