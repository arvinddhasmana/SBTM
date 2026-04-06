import { IsOptional, IsString } from 'class-validator';

export class FalseAlarmDto {
  /** User ID of the admin marking the alert as a false alarm. */
  @IsOptional()
  @IsString()
  actorUserId?: string;

  /** Role of the actor. */
  @IsOptional()
  @IsString()
  actorRole?: string;

  /**
   * Operational notes for the audit record.
   * Must not contain student names, guardian contacts, or other T4/T3 PII.
   */
  @IsOptional()
  @IsString()
  notes?: string;
}
