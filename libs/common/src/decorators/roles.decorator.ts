import { SetMetadata } from '@nestjs/common';

/**
 * SBTM v2 role enum — must match the Postgres users_role_enum exactly.
 * v1 values (ADMIN, SYSTEM, STA_ADMIN) are removed; any reference is a compile error
 * and serves as the v2 cutover audit trail.
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STA_ADMIN = 'STA_ADMIN',
  BOARD_ADMIN = 'BOARD_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  OPERATOR_ADMIN = 'OPERATOR_ADMIN',
  DRIVER = 'DRIVER',
  PARENT = 'PARENT',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
