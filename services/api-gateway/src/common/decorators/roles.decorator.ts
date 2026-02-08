import { SetMetadata } from '@nestjs/common';

export enum Role {
    ADMIN = 'ADMIN',
    DRIVER = 'DRIVER',
    PARENT = 'PARENT',
    SYSTEM = 'SYSTEM',
    OSTA_ADMIN = 'OSTA_ADMIN',
    BOARD_ADMIN = 'BOARD_ADMIN',
    SCHOOL_ADMIN = 'SCHOOL_ADMIN',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
