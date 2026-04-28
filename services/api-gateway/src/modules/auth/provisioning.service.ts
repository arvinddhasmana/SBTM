import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { InviteUserDto } from './dto/invite-user.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { Role } from '@sbtm/common';

interface InviterUser {
  id: string;
  role: Role;
  schoolId?: string;
  boardId?: string;
}

const INVITATION_EXPIRY_HOURS = parseInt(
  process.env.INVITATION_EXPIRY_HOURS ?? '72',
  10,
);

@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Invite a new user by email. Derives tenant scope from the inviting user's JWT —
   * never trusts schoolId/boardId from board- or school-level admins to exceed their own scope.
   */
  async inviteUser(
    dto: InviteUserDto,
    inviter: InviterUser,
  ): Promise<{ message: string; invitationUrl: string }> {
    this.validateInviterScope(dto, inviter);

    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + INVITATION_EXPIRY_HOURS);

    const resolvedSchoolId = this.resolveSchoolId(dto, inviter);
    const resolvedBoardId = this.resolveBoardId(dto, inviter);

    const user = this.userRepository.create({
      email: dto.email,
      role: dto.role as Role,
      schoolId: resolvedSchoolId,
      boardId: resolvedBoardId,
      isActive: false,
      invitationToken: token,
      invitationExpiresAt: expiresAt,
    });

    await this.userRepository.save(user);

    this.logger.log('User invitation created', {
      tenantId: resolvedSchoolId ?? resolvedBoardId,
      inviterId: inviter.id,
      inviteeRole: dto.role,
      action: 'user.invited',
    });

    // In production this URL would be emailed. Returned here for testing/logging purposes.
    const invitationUrl = `/activate?token=${token}`;
    return { message: 'Invitation sent', invitationUrl };
  }

  /**
   * Activate an invited account, set password and optional name fields.
   */
  async activateAccount(dto: ActivateAccountDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { invitationToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    if (!user.invitationExpiresAt || user.invitationExpiresAt < new Date()) {
      throw new BadRequestException('Invitation token has expired');
    }

    if (user.isActive) {
      throw new BadRequestException('Account is already active');
    }

    user.passwordHash = await bcrypt.hash(dto.password, 10);
    user.isActive = true;
    user.invitationToken = undefined;
    user.invitationExpiresAt = undefined;
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;

    await this.userRepository.save(user);

    this.logger.log('User account activated', {
      tenantId: user.schoolId ?? user.boardId,
      userId: user.id,
      action: 'user.activated',
    });

    return { message: 'Account activated successfully' };
  }

  /**
   * List users within the caller's tenant scope.
   */
  async listUsers(
    caller: InviterUser,
  ): Promise<
    Omit<User, 'passwordHash' | 'invitationToken' | 'invitationExpiresAt'>[]
  > {
    let users: User[] = [];

    if (caller.role === Role.SUPER_ADMIN || caller.role === Role.OSTA_ADMIN) {
      users = await this.userRepository.find();
    } else if (caller.role === Role.BOARD_ADMIN && caller.boardId) {
      users = await this.userRepository.find({
        where: { boardId: caller.boardId },
      });
    } else if (caller.role === Role.SCHOOL_ADMIN && caller.schoolId) {
      users = await this.userRepository.find({
        where: { schoolId: caller.schoolId },
      });
    } else {
      throw new ForbiddenException('Insufficient scope to list users');
    }

    return users.map(
      ({
        passwordHash: _ph,
        invitationToken: _it,
        invitationExpiresAt: _ie,
        ...rest
      }) => rest,
    );
  }

  /**
   * Deactivate a user account (soft-disable). Admins can only deactivate users in their scope.
   */
  async deactivateUser(
    targetUserId: string,
    caller: InviterUser,
  ): Promise<{ message: string }> {
    const target = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('User not found');

    this.assertCallerCanManageUser(target, caller);

    target.isActive = false;
    await this.userRepository.save(target);

    this.logger.log('User deactivated', {
      tenantId: target.schoolId ?? target.boardId,
      targetUserId: target.id,
      callerId: caller.id,
      action: 'user.deactivated',
    });

    return { message: 'User deactivated' };
  }

  /**
   * Reactivate a user account.
   */
  async reactivateUser(
    targetUserId: string,
    caller: InviterUser,
  ): Promise<{ message: string }> {
    const target = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('User not found');

    this.assertCallerCanManageUser(target, caller);

    target.isActive = true;
    await this.userRepository.save(target);

    this.logger.log('User reactivated', {
      tenantId: target.schoolId ?? target.boardId,
      targetUserId: target.id,
      callerId: caller.id,
      action: 'user.reactivated',
    });

    return { message: 'User reactivated' };
  }

  // ---------- private helpers ----------

  private validateInviterScope(dto: InviteUserDto, inviter: InviterUser): void {
    // Only SUPER_ADMIN can invite OSTA_ADMIN
    if ((dto.role as Role) === Role.OSTA_ADMIN) {
      if (inviter.role !== Role.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Only Super Admin can invite OSTA administrators',
        );
      }
      return;
    }
    if (inviter.role === Role.BOARD_ADMIN) {
      // Board admins cannot invite BOARD_ADMIN or above.
      if ((dto.role as Role) === Role.BOARD_ADMIN) {
        throw new ForbiddenException(
          'Board admins cannot create admins above their scope',
        );
      }
    }
    if (inviter.role === Role.SCHOOL_ADMIN) {
      if (dto.role !== Role.DRIVER && dto.role !== Role.PARENT) {
        throw new ForbiddenException(
          'School admins can only invite drivers and parents',
        );
      }
    }
  }

  private resolveSchoolId(
    dto: InviteUserDto,
    inviter: InviterUser,
  ): string | undefined {
    // School-scoped roles must have a schoolId
    if (
      [Role.SCHOOL_ADMIN, Role.DRIVER, Role.PARENT].includes(dto.role as Role)
    ) {
      // School admins can only set their own school
      if (inviter.role === Role.SCHOOL_ADMIN) return inviter.schoolId;
      return dto.schoolId;
    }
    return undefined;
  }

  private resolveBoardId(
    dto: InviteUserDto,
    inviter: InviterUser,
  ): string | undefined {
    if (dto.role === Role.BOARD_ADMIN) {
      if (inviter.role === Role.BOARD_ADMIN) return inviter.boardId;
      return dto.boardId;
    }
    if (inviter.role === Role.BOARD_ADMIN) return inviter.boardId;
    return dto.boardId;
  }

  private assertCallerCanManageUser(target: User, caller: InviterUser): void {
    if (caller.role === Role.SUPER_ADMIN) return;
    if (caller.role === Role.OSTA_ADMIN) return;
    if (caller.role === Role.BOARD_ADMIN && target.boardId === caller.boardId)
      return;
    if (
      caller.role === Role.SCHOOL_ADMIN &&
      target.schoolId === caller.schoolId
    )
      return;
    throw new ForbiddenException(
      'You do not have permission to manage this user',
    );
  }
}
