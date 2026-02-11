import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '../decorators/roles.decorator';

@Injectable()
export class MultiTenancyGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return false;
        }

        // OSTA_ADMIN can access everything
        if (user.role === Role.OSTA_ADMIN || user.role === Role.ADMIN || user.role === Role.SYSTEM) {
            return true;
        }

        const params = request.params;
        const query = request.query;
        const body = request.body;

        const schoolId = params.schoolId || query.schoolId || body.schoolId;
        const boardId = params.boardId || query.boardId || body.boardId;

        // If user is BOARD_ADMIN, they can only access their board or schools in their board
        if (user.role === Role.BOARD_ADMIN) {
            if (boardId && boardId !== user.boardId) {
                throw new ForbiddenException('You do not have access to this board');
            }
            // For schools, we would need to check if the school belongs to the board. 
            // For now, if schoolId is provided, we might need a service to check, 
            // but simplest case is checking boardId.
            return true;
        }

        // If user is SCHOOL_ADMIN, they can only access their school
        if (user.role === Role.SCHOOL_ADMIN) {
            if (schoolId && schoolId !== user.schoolId) {
                throw new ForbiddenException('You do not have access to this school');
            }
            return true;
        }

        return true;
    }
}
