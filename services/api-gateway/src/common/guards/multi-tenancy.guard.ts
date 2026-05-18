import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@sbtm/common';
import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';

@Injectable()
export class MultiTenancyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: Record<string, string | undefined>;
      query: Record<string, string | undefined>;
    }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    // SUPER_ADMIN and STA_ADMIN span every board/school in their tenant scope.
    if (user.role === Role.SUPER_ADMIN || user.role === Role.STA_ADMIN) {
      return true;
    }

    const params = request.params;
    const query = request.query;

    const schoolId = params.schoolId || query.schoolId;
    const boardId = params.boardId || query.boardId;

    // BOARD_ADMIN: only their own board (board→school check requires a service lookup,
    // deferred to the per-handler RLS context).
    if (user.role === Role.BOARD_ADMIN) {
      const userBoardId =
        user.anchorKind === 'board' ? user.anchorId : undefined;
      if (boardId && boardId !== userBoardId) {
        throw new ForbiddenException('You do not have access to this board');
      }
      return true;
    }

    // SCHOOL_ADMIN: only their own school
    if (user.role === Role.SCHOOL_ADMIN) {
      const userSchoolId =
        user.anchorKind === 'school' ? user.anchorId : undefined;
      if (schoolId && schoolId !== userSchoolId) {
        throw new ForbiddenException('You do not have access to this school');
      }
      return true;
    }

    return true;
  }
}
