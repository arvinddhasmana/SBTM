import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';

/**
 * Role hierarchy: higher roles implicitly satisfy lower admin roles.
 * SUPER_ADMIN > OSTA_ADMIN > BOARD_ADMIN > SCHOOL_ADMIN.
 * DRIVER, PARENT, and SYSTEM are peer roles with no hierarchy.
 */
const ROLE_INCLUDES: Record<string, Role[]> = {
  [Role.SUPER_ADMIN]: [
    Role.SUPER_ADMIN,
    Role.OSTA_ADMIN,
    Role.ADMIN,
    Role.BOARD_ADMIN,
    Role.SCHOOL_ADMIN,
  ],
  [Role.OSTA_ADMIN]: [Role.OSTA_ADMIN, Role.ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN],
  [Role.ADMIN]: [Role.ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN],
  [Role.BOARD_ADMIN]: [Role.BOARD_ADMIN, Role.SCHOOL_ADMIN],
  [Role.SCHOOL_ADMIN]: [Role.SCHOOL_ADMIN],
  [Role.DRIVER]: [Role.DRIVER],
  [Role.PARENT]: [Role.PARENT],
  [Role.SYSTEM]: [Role.SYSTEM, Role.OSTA_ADMIN, Role.ADMIN],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const satisfiedRoles = ROLE_INCLUDES[user.role] || [user.role];
    return requiredRoles.some((role) => satisfiedRoles.includes(role));
  }
}
