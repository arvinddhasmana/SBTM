import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role, ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockContext = (userRole?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: userRole ? { role: userRole } : undefined }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('should return true when no @Roles() metadata is set (public endpoint)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(createMockContext('DRIVER'))).toBe(true);
  });

  it('should return false when no user on request', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SCHOOL_ADMIN]);
    expect(guard.canActivate(createMockContext(undefined))).toBe(false);
  });

  // SUPER_ADMIN hierarchy
  it('should allow SUPER_ADMIN to access SUPER_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SUPER_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.SUPER_ADMIN))).toBe(true);
  });

  it('should allow SUPER_ADMIN to access OSTA_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.OSTA_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.SUPER_ADMIN))).toBe(true);
  });

  it('should allow SUPER_ADMIN to access BOARD_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.BOARD_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.SUPER_ADMIN))).toBe(true);
  });

  it('should allow SUPER_ADMIN to access SCHOOL_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SCHOOL_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.SUPER_ADMIN))).toBe(true);
  });

  // OSTA_ADMIN hierarchy
  it('should allow OSTA_ADMIN to access BOARD_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.BOARD_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.OSTA_ADMIN))).toBe(true);
  });

  it('should deny OSTA_ADMIN from accessing SUPER_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SUPER_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.OSTA_ADMIN))).toBe(false);
  });

  // BOARD_ADMIN hierarchy
  it('should allow BOARD_ADMIN to access SCHOOL_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SCHOOL_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.BOARD_ADMIN))).toBe(true);
  });

  it('should deny BOARD_ADMIN from accessing OSTA_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.OSTA_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.BOARD_ADMIN))).toBe(false);
  });

  // SCHOOL_ADMIN
  it('should allow SCHOOL_ADMIN to access SCHOOL_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SCHOOL_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.SCHOOL_ADMIN))).toBe(true);
  });

  it('should deny SCHOOL_ADMIN from accessing BOARD_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.BOARD_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.SCHOOL_ADMIN))).toBe(false);
  });

  // DRIVER and PARENT isolation
  it('should allow DRIVER to access DRIVER-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.DRIVER]);
    expect(guard.canActivate(createMockContext(Role.DRIVER))).toBe(true);
  });

  it('should deny DRIVER from accessing SCHOOL_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SCHOOL_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.DRIVER))).toBe(false);
  });

  it('should allow PARENT to access PARENT-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.PARENT]);
    expect(guard.canActivate(createMockContext(Role.PARENT))).toBe(true);
  });

  it('should deny PARENT from accessing admin-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SCHOOL_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.PARENT))).toBe(false);
  });

  // SYSTEM role
  it('should allow SYSTEM to access OSTA_ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.OSTA_ADMIN]);
    expect(guard.canActivate(createMockContext(Role.SYSTEM))).toBe(true);
  });

  it('should allow SYSTEM to access ADMIN-required endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(createMockContext(Role.SYSTEM))).toBe(true);
  });

  // Multiple required roles
  it('should pass if user satisfies any of multiple required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.DRIVER, Role.PARENT]);
    expect(guard.canActivate(createMockContext(Role.DRIVER))).toBe(true);
  });

  // Unknown role fallback
  it('should fall back to exact match for unknown roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['UNKNOWN_ROLE' as Role]);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'UNKNOWN_ROLE' } }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should use ROLES_KEY when looking up metadata', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const ctx = createMockContext(Role.ADMIN);
    guard.canActivate(ctx);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.arrayContaining([expect.any(Function), expect.any(Function)]),
    );
  });
});
