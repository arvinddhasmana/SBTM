import { IsString, IsIn, IsUUID, IsOptional } from 'class-validator';
import type { DeviceTokenRecipientKind } from '../entities/device-token.entity';

export class RegisterDeviceTokenDto {
  /**
   * v2-followups #6: recipients are polymorphic across `users` (admin/driver)
   * and `stx_guardians` (parents). Defaults to 'user' so existing admin/driver
   * registration calls don't need to change.
   */
  @IsOptional()
  @IsIn(['user', 'guardian'])
  recipientKind?: DeviceTokenRecipientKind;

  @IsUUID()
  recipientId: string;

  @IsUUID()
  schoolId: string;

  @IsString()
  token: string;

  @IsIn(['android', 'ios', 'web'])
  platform: string;
}
