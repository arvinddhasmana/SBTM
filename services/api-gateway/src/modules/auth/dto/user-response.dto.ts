import { Role } from '@sbtm/common';

export class UserResponseDto {
  id: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  driverId?: string;
  childRouteIds?: string[];
  assignedRouteIds?: string[];
  schoolId?: string;
  boardId?: string;
}

export class LoginResponseDto {
  accessToken: string;
  user: UserResponseDto;
}
