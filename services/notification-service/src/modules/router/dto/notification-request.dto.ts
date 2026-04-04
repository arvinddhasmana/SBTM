import { IsString, IsUUID, IsOptional } from 'class-validator';

export class NotificationRequestDto {
  @IsString()
  eventType: string;

  @IsUUID()
  eventSourceId: string;

  @IsUUID()
  recipientUserId: string;

  @IsUUID()
  schoolId: string;

  @IsUUID()
  @IsOptional()
  routeId?: string;

  @IsUUID()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  emergencyType?: string;
}
