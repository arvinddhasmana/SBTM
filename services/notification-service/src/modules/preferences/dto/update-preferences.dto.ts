import {
  IsString,
  IsIn,
  IsBoolean,
  IsUUID,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_CHANNELS,
} from '../entities/notification-preference.entity';

export class PreferenceItemDto {
  @IsIn([...NOTIFICATION_EVENT_TYPES])
  eventType: string;

  @IsIn([...NOTIFICATION_CHANNELS])
  channel: string;

  @IsBoolean()
  enabled: boolean;
}

export class UpdatePreferencesDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  schoolId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences: PreferenceItemDto[];
}
