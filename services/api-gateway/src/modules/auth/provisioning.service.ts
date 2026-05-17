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
import { User, AnchorKind } from './entities/user.entity';
import { InviteUserDto } from './dto/invite-user.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { Role } from '@sbtm/common';

interface InviterUser {
  id: string;
  role: Role;
  anchorKind?: AnchorKind | null;
  anchorId?: string | null;
}

const INVITATION_EXPIRY_HOURS = parseInt(
  process.env.INVITATION_EXPIRY_HOURS ?? '72',
  10,
);

/**
 * v2 anchor mapping per role. The role enum implies which anchor kind the user must carry.
 */
const REQUIRED_ANCHOR_KIND_FOR_ROLE: Partial<Record<Role, AnchorKind>> = {
  [Role.STA_ADMIN]: 'sta',
  [Role.BOARD_ADMIN]: 'board',
  [Role.SCHOOL_ADMIN]: 'school',
  [Role.OPERATOR_ADMIN]: 'operator',
  [Role.DRIVER]: 'driver',
  [Role.PARENT]: 'parent',
};

@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Invite a new user by email. Derives anchor scope from the inviting user's JWT —
   * never trusts anchorId from board- or school-level admins to exceed their own scope.
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

    const { anchorKind, anchorId } = this.resolveAnchor(dto, inviter);

    const user = this.userRepository.create({
      email: dto.email,
      role: dto.role as Role,
      anchorKind,
      anchorId,
      isActive: false,
      invitationToken: token,
      invitationExpiresAt: expiresAt,
    });

    await this.userRepository.save(user);

    this.logger.log('User invitation created', {
      anchorKind,
      anchorId,
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
      anchorKind: user.anchorKind,
      anchorId: user.anchorId,
      userId: user.id,
      action: 'user.activated',
    });

    return { message: 'Account activated successfully' };
  }

  /**
   * List users within the caller's anchor scope.
   * TODO(phase-B): for BOARD admin, restrict to users whose anchorKind is 'board' AND
   * anchorId === caller.anchorId, OR anchorKind='school' AND that school belongs to the board.
   * Cross-anchor filtering requires joining stx_schools — left as-is until the school
   * repository is wired into this service.
   */
  async listUsers(
    caller: InviterUser,
  ): Promise<
    Omit<User, 'passwordHash' | 'invitationToken' | 'invitationExpiresAt'>[]
  > {
    let users: User[] = [];

    if (caller.role === Role.SUPER_ADMIN) {
      users = await this.userRepository.find();
    } else if (caller.role === Role.STA_ADMIN && caller.anchorId) {
      // STA admins see every user under their STA. Restricting precisely requires joins
      // (boards/schools/operators all roll up to sta_id) — for now, surface all users.
      users = await this.userRepository.find();
    } else if (
      (caller.role === Role.BOARD_ADMIN ||
        caller.role === Role.SCHOOL_ADMIN ||
        caller.role === Role.OPERATOR_ADMIN) &&
      caller.anchorKind &&
      caller.anchorId
    ) {
      users = await this.userRepository.find({
        where: {
          anchorKind: caller.anchorKind,
          anchorId: caller.anchorId,
        },
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
      anchorKind: target.anchorKind,
      anchorId: target.anchorId,
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
      anchorKind: target.anchorKind,
      anchorId: target.anchorId,
      targetUserId: target.id,
      callerId: caller.id,
      action: 'user.reactivated',
    });

    return { message: 'User reactivated' };
  }

  // ---------- private helpers ----------

  private validateInviterScope(dto: InviteUserDto, inviter: InviterUser): void {
    // Only SUPER_ADMIN can invite STA_ADMIN
    if ((dto.role as Role) === Role.STA_ADMIN) {
      if (inviter.role !== Role.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Only Super Admin can invite STA administrators',
        );
      }
      return;
    }
    if (inviter.role === Role.BOARD_ADMIN) {
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

  /**
   * Resolve the (anchorKind, anchorId) for the new user, derived from the inviter's scope
   * where possible and validated against the role being assigned.
   */
  private resolveAnchor(
    dto: InviteUserDto,
    inviter: InviterUser,
  ): { anchorKind: AnchorKind | null; anchorId: string | null } {
    const expectedKind =
      REQUIRED_ANCHOR_KIND_FOR_ROLE[dto.role as Role] ?? null;
    if (!expectedKind) {
      return { anchorKind: null, anchorId: null };
    }

    // Mid-tier admins must inherit their own anchor — they cannot grant scope they don't have.
    if (
      inviter.role === Role.BOARD_ADMIN &&
      expectedKind === 'board' &&
      inviter.anchorKind === 'board'
    ) {
      return { anchorKind: 'board', anchorId: inviter.anchorId ?? null };
    }
    if (
      inviter.role === Role.SCHOOL_ADMIN &&
      expectedKind === 'school' &&
      inviter.anchorKind === 'school'
    ) {
      return { anchorKind: 'school', anchorId: inviter.anchorId ?? null };
    }
    if (
      inviter.role === Role.SCHOOL_ADMIN &&
      (expectedKind === 'driver' || expectedKind === 'parent')
    ) {
      // Driver/parent anchors point at the driver row or guardian row, which must be
      // created separately. We persist null here; downstream linkage code attaches it.
      return { anchorKind: expectedKind, anchorId: dto.anchorId ?? null };
    }

    // Higher-tier admins (SUPER, STA) may pass an explicit anchorId.
    if (!dto.anchorId) {
      throw new BadRequestException(
        `Role ${dto.role} requires anchorId of kind '${expectedKind}'`,
      );
    }
    if (dto.anchorKind && dto.anchorKind !== expectedKind) {
      throw new BadRequestException(
        `Role ${dto.role} requires anchorKind '${expectedKind}'`,
      );
    }
    return { anchorKind: expectedKind, anchorId: dto.anchorId };
  }

  private assertCallerCanManageUser(target: User, caller: InviterUser): void {
    if (caller.role === Role.SUPER_ADMIN) return;
    if (caller.role === Role.STA_ADMIN) return;
    if (
      (caller.role === Role.BOARD_ADMIN ||
        caller.role === Role.SCHOOL_ADMIN ||
        caller.role === Role.OPERATOR_ADMIN) &&
      caller.anchorKind &&
      caller.anchorId &&
      target.anchorKind === caller.anchorKind &&
      target.anchorId === caller.anchorId
    ) {
      return;
    }
    throw new ForbiddenException(
      'You do not have permission to manage this user',
    );
  }
}
