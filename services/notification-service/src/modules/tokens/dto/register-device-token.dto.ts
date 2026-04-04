import { IsString, IsIn, IsUUID } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  schoolId: string;

  @IsString()
  token: string;

  @IsIn(['android', 'ios', 'web'])
  platform: string;
}
