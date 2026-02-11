import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MultiTenancyGuard } from './multi-tenancy.guard';
import { Role } from '../decorators/roles.decorator';

describe('MultiTenancyGuard', () => {
    let guard: MultiTenancyGuard;

    beforeEach(() => {
        guard = new MultiTenancyGuard();
    });

    const createMockContext = (user: any, params = {}, query = {}, body = {}) => {
        return {
            switchToHttp: () => ({
                getRequest: () => ({
                    user,
                    params,
                    query,
                    body,
                }),
            }),
        } as unknown as ExecutionContext;
    };

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should allow OSTA_ADMIN to access anything', () => {
        const context = createMockContext({ role: Role.OSTA_ADMIN });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow SCHOOL_ADMIN to access their own school', () => {
        const context = createMockContext(
            { role: Role.SCHOOL_ADMIN, schoolId: 'school-123' },
            { schoolId: 'school-123' }
        );
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should forbid SCHOOL_ADMIN from accessing another school', () => {
        const context = createMockContext(
            { role: Role.SCHOOL_ADMIN, schoolId: 'school-123' },
            { schoolId: 'school-456' }
        );
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow BOARD_ADMIN to access their own board', () => {
        const context = createMockContext(
            { role: Role.BOARD_ADMIN, boardId: 'board-789' },
            { boardId: 'board-789' }
        );
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should forbid BOARD_ADMIN from accessing another board', () => {
        const context = createMockContext(
            { role: Role.BOARD_ADMIN, boardId: 'board-789' },
            { boardId: 'board-000' }
        );
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
});
