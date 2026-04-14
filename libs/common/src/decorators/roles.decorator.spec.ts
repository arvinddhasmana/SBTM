import { Role, ROLES_KEY, Roles } from './roles.decorator';

describe('Roles Decorator', () => {
  it('should define all expected role values', () => {
    expect(Role.SUPER_ADMIN).toBe('SUPER_ADMIN');
    expect(Role.ADMIN).toBe('ADMIN');
    expect(Role.OSTA_ADMIN).toBe('OSTA_ADMIN');
    expect(Role.BOARD_ADMIN).toBe('BOARD_ADMIN');
    expect(Role.SCHOOL_ADMIN).toBe('SCHOOL_ADMIN');
    expect(Role.DRIVER).toBe('DRIVER');
    expect(Role.PARENT).toBe('PARENT');
    expect(Role.SYSTEM).toBe('SYSTEM');
  });

  it('should export ROLES_KEY as "roles"', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('should return a decorator function', () => {
    const decorator = Roles(Role.ADMIN, Role.DRIVER);
    expect(typeof decorator).toBe('function');
  });
});
