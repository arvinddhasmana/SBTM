import { Role } from '../../../common/decorators/roles.decorator';

export class UserResponseDto {
    id: string;
    email: string;
    role: Role;
    firstName?: string;
    lastName?: string;
    driverId?: string;
    childRouteIds?: string[];
    assignedRouteIds?: string[];
}

export class LoginResponseDto {
    accessToken: string;
    user: UserResponseDto;
}
