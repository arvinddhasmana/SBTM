import { Role } from '@sbtm/common';
import type { AnchorKind } from '../entities/user.entity';

export class UserResponseDto {
  id: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  /** v2 anchor scope (replaces v1 schoolId/boardId/driverId on the user object). */
  anchorKind: AnchorKind | null;
  anchorId: string | null;
  preferredLanguage: string;
}

export class LoginResponseDto {
  accessToken: string;
  user: UserResponseDto;
}
