import { SetMetadata } from '@nestjs/common';

export enum Role {
    ADMIN = 'ADMIN',
    DRIVER = 'DRIVER',
    PARENT = 'PARENT',
    SYSTEM = 'SYSTEM',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
