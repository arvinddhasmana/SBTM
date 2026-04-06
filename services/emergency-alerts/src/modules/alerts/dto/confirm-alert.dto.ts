import { IsOptional, IsString } from 'class-validator';

export class ConfirmAlertDto {
  /** User ID of the admin confirming the alert. Sourced from gateway-forwarded identity. */
  @IsOptional()
  @IsString()
  actorUserId?: string;

  /** Role of the confirming actor. Sourced from gateway-forwarded identity. */
  @IsOptional()
  @IsString()
  actorRole?: string;
}
