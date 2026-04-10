import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StatusUpdateDto {
  /** Operational notes for the status update. No T4 PII permitted. */
  @IsNotEmpty()
  @IsString()
  notes: string;

  @IsOptional()
  @IsString()
  actorUserId?: string;

  @IsOptional()
  @IsString()
  actorRole?: string;
}
