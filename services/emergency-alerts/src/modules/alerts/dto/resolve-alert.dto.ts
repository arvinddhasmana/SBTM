import { IsOptional, IsString } from 'class-validator';

export class ResolveAlertDto {
  /** Optional resolution notes. No T4 PII permitted. */
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  actorUserId?: string;

  @IsOptional()
  @IsString()
  actorRole?: string;
}
