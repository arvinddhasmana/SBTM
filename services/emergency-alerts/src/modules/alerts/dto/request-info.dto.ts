import { IsOptional, IsString } from 'class-validator';

export class RequestInfoDto {
  /** User ID of the admin requesting more information. */
  @IsOptional()
  @IsString()
  actorUserId?: string;

  /** Role of the actor. */
  @IsOptional()
  @IsString()
  actorRole?: string;
}
