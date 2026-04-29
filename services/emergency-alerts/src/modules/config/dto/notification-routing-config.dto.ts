import { IsString, IsArray, IsBoolean, IsOptional, IsEnum, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationRoutingConfigDto {
  @ApiProperty({ example: 'TIER_1', enum: ['TIER_1', 'TIER_2', 'TIER_3'] })
  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  tier: string;

  @ApiProperty({ example: 'PANIC_BUTTON', required: false, description: 'Specific event type, or null for all events in tier' })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiProperty({ example: 'PARENT', enum: ['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN', 'DRIVER', 'PARENT', 'SYSTEM'] })
  @IsEnum(['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN', 'DRIVER', 'PARENT', 'SYSTEM'])
  recipientRole: string;

  @ApiProperty({ example: 'IMMEDIATE', enum: ['IMMEDIATE', 'AFTER_CONFIRMATION', 'ON_TIMEOUT', 'ON_ESCALATION'] })
  @IsEnum(['IMMEDIATE', 'AFTER_CONFIRMATION', 'ON_TIMEOUT', 'ON_ESCALATION'])
  notificationTiming: string;

  @ApiProperty({ example: ['PUSH', 'SMS'], type: [String], description: 'Array of notification channels' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  channels: string[];

  @ApiProperty({ example: true, description: 'Whether this notification is mandatory' })
  @IsBoolean()
  isMandatory: boolean;
}

export class UpdateNotificationRoutingConfigDto {
  @ApiProperty({ required: false })
  @IsEnum(['IMMEDIATE', 'AFTER_CONFIRMATION', 'ON_TIMEOUT', 'ON_ESCALATION'])
  @IsOptional()
  notificationTiming?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  channels?: string[];

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
