import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Role } from '@sbtm/common';

const INVITABLE_ROLES = [
  Role.OSTA_ADMIN,
  Role.BOARD_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.DRIVER,
  Role.PARENT,
] as const;

type InvitableRole = (typeof INVITABLE_ROLES)[number];

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(INVITABLE_ROLES)
  role: InvitableRole;

  /** Required for SCHOOL_ADMIN, DRIVER, PARENT roles — scoped from authenticated user for BOARD_ADMIN. */
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  /** Required only for BOARD_ADMIN role; OSTA_ADMIN sets this explicitly. */
  @IsOptional()
  @IsUUID()
  boardId?: string;
}
