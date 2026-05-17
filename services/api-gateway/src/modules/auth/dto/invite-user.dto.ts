import { IsEmail, IsEnum, IsOptional, IsUUID, IsIn } from 'class-validator';
import { Role } from '@sbtm/common';
import type { AnchorKind } from '../entities/user.entity';

const INVITABLE_ROLES = [
  Role.STA_ADMIN,
  Role.BOARD_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.OPERATOR_ADMIN,
  Role.DRIVER,
  Role.PARENT,
] as const;

type InvitableRole = (typeof INVITABLE_ROLES)[number];

const ANCHOR_KINDS: AnchorKind[] = [
  'sta',
  'board',
  'school',
  'operator',
  'driver',
  'parent',
];

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(INVITABLE_ROLES)
  role: InvitableRole;

  /**
   * v2 anchor scoping — required for non-SUPER roles. The anchor kind must agree with
   * the role being invited (e.g. SCHOOL_ADMIN ⇒ kind 'school', OPERATOR_ADMIN ⇒ 'operator').
   * ProvisioningService validates this server-side as well.
   */
  @IsOptional()
  @IsIn(ANCHOR_KINDS)
  anchorKind?: AnchorKind;

  @IsOptional()
  @IsUUID()
  anchorId?: string;
}
